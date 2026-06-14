/**
 * Service-status transition detector + alert fan-out.
 *
 * Each run probes the live system health, diffs it against the last snapshot persisted in
 * `service_status`, and — ONLY on a transition (operational → down, or down → recovered) — emails
 * every active row in `status_alert_recipient`. Steady states never email, so a service that is
 * down for an hour produces exactly one outage email and one recovery email, no matter how often
 * the check runs. The same snapshot also powers the user-facing outage banner
 * (src/lib/status/outages.ts).
 *
 * Callers: the /api/cron/health endpoint (GitHub Actions, the guaranteed cadence) and the admin
 * live hub (opportunistic — while an admin is watching /admin/system the same probe results feed
 * detection, so transitions are caught within ~a minute instead of the cron interval).
 *
 * Known blast-radius limit: the snapshot and the recipient list live in Aurora, so if AURORA
 * itself is the outage this checker cannot read recipients or record the transition — the cron
 * run fails loudly (non-2xx → red GitHub Actions run) instead.
 *
 * 🔒 Server-only, privileged writes; no tenant data touched. Both trails per AGENTS.md:
 * `serverLog` on every run; there is no circle to audit, so the operational log is the record.
 */
import 'server-only';
import { eq } from 'drizzle-orm';
import { getPlatformDb, isPlatformDbConfigured, logPlatformAccess, type PlatformActor } from '@/db/admin-db';
import { serviceStatus, statusAlertRecipient } from '@/db/schema';
import { getSystemHealth } from './system-health';
import { sendServiceStatusEmail } from '@/lib/email';
import { serverLog } from '@/lib/log';
import { getAppOrigin } from '@/lib/url';
import type { Service, SystemHealthData } from './system-types';
import type { StatusRecipient } from './dashboard-data';

export type StatusCheckResult = {
  ran: boolean;
  wentDown: string[];
  recovered: string[];
  emailed: number;
};

const SKIPPED: StatusCheckResult = { ran: false, wentDown: [], recovered: [], emailed: 0 };

// Prevent overlapping runs inside one server instance (cron + live hub can coincide). Across
// instances a rare double-email is possible but harmless — transitions are still one-shot per
// instance because both read the same persisted snapshot.
let running = false;

/** HH:MM UTC label, matching the console's deterministic clock format. */
function clockLabel(iso: string): string {
  return `${iso.slice(11, 16)} UTC`;
}

/**
 * Probe (or reuse a fresh probe), persist the snapshot, and email recipients on any
 * down/recovered transition. Never throws for a single failed email; throws only when the
 * snapshot itself can't be read/written (so the cron run shows red).
 */
export async function runStatusCheck(health?: SystemHealthData): Promise<StatusCheckResult> {
  if (!isPlatformDbConfigured() || running) return SKIPPED;
  running = true;
  try {
    const h = health ?? (await getSystemHealth());
    const db = getPlatformDb();
    const now = new Date();

    const prevRows = await db.select().from(serviceStatus);
    const prev = new Map(prevRows.map((r) => [r.name, r]));

    const wentDown: Service[] = [];
    const recovered: Service[] = [];

    for (const s of h.services) {
      const p = prev.get(s.name);
      // First sighting counts as a transition too — a service that is born down should alert.
      if (s.status === 'down' && p?.status !== 'down') wentDown.push(s);
      if (p?.status === 'down' && s.status !== 'down') recovered.push(s);

      if (!p) {
        await db.insert(serviceStatus).values({
          name: s.name,
          status: s.status,
          metric: s.metric,
          since: now,
          checkedAt: now,
        });
      } else {
        await db
          .update(serviceStatus)
          .set({
            status: s.status,
            metric: s.metric,
            checkedAt: now,
            // `since` marks when the CURRENT status began — only reset on a change.
            ...(p.status !== s.status ? { since: now } : {}),
          })
          .where(eq(serviceStatus.name, s.name));
      }
    }

    let emailed = 0;
    if (wentDown.length > 0 || recovered.length > 0) {
      emailed = await notifyRecipients(h, wentDown, recovered);
    }

    serverLog('status', 'runStatusCheck', 'success', {
      down: wentDown.map((s) => s.name).join('|') || '-',
      recovered: recovered.map((s) => s.name).join('|') || '-',
      emailed,
    });
    return {
      ran: true,
      wentDown: wentDown.map((s) => s.name),
      recovered: recovered.map((s) => s.name),
      emailed,
    };
  } catch (err) {
    serverLog('status', 'runStatusCheck', 'failure', { reason: (err as Error)?.name ?? 'error' });
    throw err;
  } finally {
    running = false;
  }
}

/** Fan the outage / recovery emails out to every active recipient. Best-effort per address. */
async function notifyRecipients(
  h: SystemHealthData,
  wentDown: Service[],
  recovered: Service[],
): Promise<number> {
  const recipients = await getPlatformDb()
    .select({ email: statusAlertRecipient.email })
    .from(statusAlertRecipient)
    .where(eq(statusAlertRecipient.active, true));
  if (recipients.length === 0) {
    serverLog('status', 'notifyRecipients', 'failure', { reason: 'no_active_recipients' });
    return 0;
  }

  const statusUrl = `${await getAppOrigin()}/admin/system`;
  const checkedAtLabel = clockLabel(h.checkedAt);
  const stillDown = h.services
    .filter((s) => s.status === 'down')
    .map((s) => ({ name: s.name, metric: s.metric }));

  const sends: Promise<unknown>[] = [];
  for (const kind of ['down', 'recovered'] as const) {
    const changed = (kind === 'down' ? wentDown : recovered).map((s) => ({
      name: s.name,
      metric: s.metric,
    }));
    if (changed.length === 0) continue;
    for (const r of recipients) {
      sends.push(
        sendServiceStatusEmail({ to: r.email, kind, changed, stillDown, statusUrl, checkedAtLabel }),
      );
    }
  }

  const results = await Promise.allSettled(sends);
  return results.filter((r) => r.status === 'fulfilled').length;
}

/** The alert recipient list for the /admin/system management card (privileged, access-logged). */
export async function getStatusRecipients(actor: PlatformActor): Promise<StatusRecipient[]> {
  const rows = await getPlatformDb()
    .select({
      id: statusAlertRecipient.id,
      email: statusAlertRecipient.email,
      name: statusAlertRecipient.name,
      active: statusAlertRecipient.active,
    })
    .from(statusAlertRecipient)
    .orderBy(statusAlertRecipient.createdAt);
  logPlatformAccess(actor, 'status_recipients', { count: rows.length });
  return rows;
}
