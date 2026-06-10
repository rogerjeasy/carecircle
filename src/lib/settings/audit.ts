'use server';

/**
 * Settings → Privacy & security backends: the circle's real append-only audit log, and a logged
 * data-export request.
 *
 * Security (see AGENTS.md): the `audit_log` SELECT policy already limits reads to owner/family_admin
 * (drizzle/0001), so we mirror that here and return forbidden to anyone else. Viewing the ledger is
 * itself recorded only operationally (no second audit row per view); requesting an export writes a
 * durable `export` audit row (and logs operationally).
 */
import { and, desc, eq } from 'drizzle-orm';
import { format } from 'date-fns';
import { requireSession, withAuthedDb } from '@/db/dal';
import { recordAuditEvent } from '@/db/audit';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { auditLog, membership, users } from '@/db/schema';
import { authorColorFor, initialsFrom } from '@/components/timeline/utils';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'The audit log is available to coordinators.';
const VIEW_ROLES = new Set(['owner', 'family_admin']);

interface ActorContext {
  userId: string;
  circleId: string;
  role: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ role: membership.role })
      .from(membership)
      .where(and(eq(membership.circleId, circleId), eq(membership.userId, user.id), eq(membership.status, 'active')))
      .limit(1),
  );
  if (!m) return null;
  return { userId: user.id, circleId, role: m.role };
}

export interface AuditLogEntry {
  id: string;
  actor: { name: string; initials: string; color: string };
  /** Human action phrase (the stored summary), e.g. "Reported a fall (high)". */
  actionLabel: string;
  /** The entity type touched, e.g. "incident" / "task". */
  entity: string;
  /** Pre-formatted timestamp, e.g. "Jun 7, 2026 · 8:04 AM". */
  at: string;
}

export type LoadAuditResult = { ok: true; entries: AuditLogEntry[] } | { ok: false; error: string };

/** Load the active circle's audit log, newest first (owner / family_admin only). */
export async function loadCircleAuditLog(): Promise<LoadAuditResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!VIEW_ROLES.has(ctx.role)) return { ok: false, error: FORBIDDEN };

  try {
    const rows = await withAuthedDb((tx) =>
      tx
        .select({
          id: auditLog.id,
          action: auditLog.action,
          entityType: auditLog.entityType,
          summary: auditLog.summary,
          occurredAt: auditLog.occurredAt,
          actorUserId: auditLog.actorUserId,
          actorName: users.name,
        })
        .from(auditLog)
        .leftJoin(users, eq(users.id, auditLog.actorUserId))
        .where(eq(auditLog.circleId, ctx.circleId))
        .orderBy(desc(auditLog.occurredAt))
        .limit(200),
    );

    const entries: AuditLogEntry[] = rows.map((r) => {
      const name = r.actorName ?? 'CareCircle';
      return {
        id: r.id,
        actor: {
          name,
          initials: r.actorName ? initialsFrom(name) : 'CC',
          color: authorColorFor(r.actorUserId ?? 'system'),
        },
        actionLabel: r.summary ?? r.action,
        entity: r.entityType ?? '',
        at: format(r.occurredAt, 'MMM d, yyyy · h:mm a'),
      };
    });

    serverLog('settings', 'loadAuditLog', 'success', { actor: ctx.userId, entries: entries.length });
    return { ok: true, entries };
  } catch (err) {
    serverLog('settings', 'loadAuditLog', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/**
 * Record a request to export this circle's care record. The async generation/delivery of the file
 * is out of scope here; this writes the durable `export` audit row (who asked, when) so the action
 * is accountable, and returns success for the UI's "we'll email you a link" confirmation.
 */
export async function requestDataExport(): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('settings', 'requestExport', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!VIEW_ROLES.has(ctx.role)) return { ok: false, error: 'Exporting the care record is available to coordinators.' };

  try {
    await recordAuditEvent(ctx.userId, {
      circleId: ctx.circleId,
      action: 'export',
      entityType: 'circle',
      entityId: ctx.circleId,
      summary: 'Requested a care-record export',
    });
    serverLog('settings', 'requestExport', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('settings', 'requestExport', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
