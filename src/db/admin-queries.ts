/**
 * Cross-tenant reads for the platform super-admin console.
 *
 * These run on the PRIVILEGED (RLS-bypassing) connection from ./admin-db, so they can aggregate
 * across every care circle. They are the "live swap" for the demo arrays in
 * `@/lib/admin/dashboard-data`. Every function that exposes tenant data takes the acting admin and
 * records the access via `logPlatformAccess`.
 *
 * ⚠️ Only ever call these from code already gated by `requirePlatformAdmin()`.
 */
import 'server-only';
import { and, desc, eq, gte, isNull, or, sql } from 'drizzle-orm';
import { getPlatformDb, logPlatformAccess, type PlatformActor } from './admin-db';
import {
  auditLog,
  platformAuthAudit,
  careCircle,
  careRecipientProfile,
  invitation,
  membership,
  timelineEvent,
  users,
} from './schema';
import type { Alert, AuditEvent, Tenant } from '@/lib/admin/dashboard-data';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The `platform_auth_audit` table is the newest metric source; if it can't be read (e.g. the
 * `0007` migration hasn't been applied yet), the sign-in figures must degrade to empty WITHOUT
 * taking down the rest of the live platform console. Logs the real cause so it's diagnosable
 * (instead of the page's outer catch masking it as a connection failure).
 */
async function safeAuthAudit<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const code = (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error';
    console.error(`[admin] platform_auth_audit unavailable (run \`npm run db:migrate\`?): ${code}`);
    return fallback;
  }
}

/** Result of a database liveness probe — drives the Aurora row on the status page. */
export type DbProbe = { ok: boolean; latencyMs: number };

/**
 * Real liveness + latency probe against Aurora. Times a trivial round-trip so the status page
 * shows a measured number, not a hard-coded one. Never throws — a failure is itself the signal.
 */
export async function pingDb(): Promise<DbProbe> {
  const started = performance.now();
  try {
    await getPlatformDb().execute(sql`select 1`);
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch {
    return { ok: false, latencyMs: Math.round(performance.now() - started) };
  }
}

/**
 * Count of urgent safety signals raised across ALL circles in the last 24h — the "Open incidents"
 * tile. An incident is any urgent event or an explicit `incident`-type timeline row.
 */
export async function getOpenIncidentCount(): Promise<number> {
  const since = new Date(Date.now() - DAY_MS);
  const [row] = await getPlatformDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(timelineEvent)
    .where(
      and(
        gte(timelineEvent.occurredAt, since),
        or(eq(timelineEvent.isUrgent, true), eq(timelineEvent.eventType, 'incident')),
      ),
    );
  return row?.count ?? 0;
}

/**
 * Raw cross-tenant safety feed — NO audit logging. The live hub calls this once per incident and
 * then logs the access for EACH connected admin separately (so a shared query still produces an
 * accurate per-viewer audit trail). Prefer `getSafetyAlerts` for one-off reads.
 */
export async function querySafetyAlerts(limit = 8): Promise<Alert[]> {
  const since = new Date(Date.now() - 7 * DAY_MS);
  const rows = await getPlatformDb()
    .select({
      id: timelineEvent.id,
      summary: timelineEvent.summary,
      eventType: timelineEvent.eventType,
      isUrgent: timelineEvent.isUrgent,
      occurredAt: timelineEvent.occurredAt,
      circle: careCircle.name,
    })
    .from(timelineEvent)
    .innerJoin(careCircle, eq(careCircle.id, timelineEvent.circleId))
    .where(
      and(
        gte(timelineEvent.occurredAt, since),
        or(eq(timelineEvent.isUrgent, true), eq(timelineEvent.eventType, 'incident')),
      ),
    )
    .orderBy(desc(timelineEvent.occurredAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.summary,
    circle: r.circle,
    level: r.isUrgent || r.eventType === 'incident' ? 'high' : 'medium',
    time: formatClock(r.occurredAt),
  }));
}

/**
 * The live "Safety alerts" feed: the most recent decline / risk signals surfaced across every
 * circle. Sourced from urgent + incident timeline events, newest first, joined to the circle name.
 * Times are pre-formatted server-side (HH:MM, 24h) to avoid hydration drift, matching the demo shape.
 * Records the cross-tenant access against the requesting admin.
 */
export async function getSafetyAlerts(actor: PlatformActor, limit = 8): Promise<Alert[]> {
  const alerts = await querySafetyAlerts(limit);
  logPlatformAccess(actor, 'safety_alerts', { count: alerts.length });
  return alerts;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  family_admin: 'Family admin',
  family: 'Family',
  caregiver: 'Caregiver',
  read_only: 'Read-only',
  care_recipient: 'Care recipient',
  clinician: 'Clinician',
};

/** Heuristic severity for the audit UI: destructive/clinical changes stand out from routine reads. */
function auditSeverity(action: string | null, entityType: string | null): AuditEvent['severity'] {
  if (action === 'delete' || entityType === 'incident') return 'warning';
  if (action === 'update' || action === 'export') return 'notice';
  return 'info';
}

/**
 * The real append-only audit ledger across ALL circles, newest first — the live source for the
 * admin "Security & audit log". Joins each row to the actor's name + their role in that circle.
 * Runs on the privileged connection (RLS-bypassing) and records the cross-tenant access itself.
 */
export async function getRecentAuditEvents(actor: PlatformActor, limit = 50): Promise<AuditEvent[]> {
  const rows = await getPlatformDb()
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      summary: auditLog.summary,
      occurredAt: auditLog.occurredAt,
      circle: careCircle.name,
      actorName: users.name,
      role: membership.role,
    })
    .from(auditLog)
    .leftJoin(careCircle, eq(careCircle.id, auditLog.circleId))
    .leftJoin(users, eq(users.id, auditLog.actorUserId))
    .leftJoin(
      membership,
      and(eq(membership.circleId, auditLog.circleId), eq(membership.userId, auditLog.actorUserId)),
    )
    .orderBy(desc(auditLog.occurredAt))
    .limit(limit);

  logPlatformAccess(actor, 'audit_log', { count: rows.length });

  return rows.map((r) => ({
    id: r.id,
    time: formatClock(r.occurredAt),
    actor: r.actorName ?? 'System',
    role: r.role ? ROLE_LABELS[r.role] ?? r.role : r.actorName ? 'Member' : 'System',
    action: (r.action ?? 'read') as AuditEvent['action'],
    entity: r.entityType ?? '—',
    circle: r.circle ?? '—',
    summary: r.summary ?? '',
    severity: auditSeverity(r.action, r.entityType),
  }));
}

/** Headline counts for the audit page's summary tiles, over the last 24h. */
export type AuditStats = {
  total: number;
  logins: number;
  exports: number;
  roleAndInvite: number;
};

/**
 * Aggregate the real `audit_log` over the last 24h for the admin summary tiles. One grouped query
 * with FILTER clauses (no N round-trips). Privileged + access-logged, like the other admin reads.
 */
export async function getAuditStats(actor: PlatformActor): Promise<AuditStats> {
  const since = new Date(Date.now() - DAY_MS);
  const db = getPlatformDb();

  // Sign-ins come from the canonical per-user `platform_auth_audit` (one row per sign-in, includes
  // circle-less users like platform admins) — NOT the per-circle `audit_log`, which omits them and
  // double-counts members by their circle count. The other tiles are circle-scoped audit events.
  const [row, loginRow] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        exports: sql<number>`count(*) filter (where ${auditLog.action} = 'export')::int`,
        roleAndInvite: sql<number>`count(*) filter (where ${auditLog.action} = 'invite' or ${auditLog.entityType} = 'membership')::int`,
      })
      .from(auditLog)
      .where(gte(auditLog.occurredAt, since))
      .then((r) => r[0]),
    safeAuthAudit({ logins: 0 }, () =>
      db
        .select({ logins: sql<number>`count(*)::int` })
        .from(platformAuthAudit)
        .where(and(eq(platformAuthAudit.action, 'login'), gte(platformAuthAudit.occurredAt, since)))
        .then((r) => r[0] ?? { logins: 0 }),
    ),
  ]);

  logPlatformAccess(actor, 'audit_stats');
  return {
    total: row?.total ?? 0,
    logins: loginRow?.logins ?? 0,
    exports: row?.exports ?? 0,
    roleAndInvite: row?.roleAndInvite ?? 0,
  };
}

/** Headline platform counts for the overview KPIs (real cross-tenant aggregates). */
export type PlatformCounts = {
  circles: number;
  users30d: number;
  meds24h: number;
  audit24h: number;
  incidents: number;
  members: number;
  pendingInvites: number;
};

/**
 * Real values for the overview KPI tiles. Note `meds24h` uses `timeline_event(event_type='med')`
 * as the proxy until the dedicated medication tables land — swap the source when they do.
 */
export async function getPlatformCounts(actor: PlatformActor): Promise<PlatformCounts> {
  const db = getPlatformDb();
  const since24 = new Date(Date.now() - DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [circles] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(careCircle)
    .where(isNull(careCircle.deletedAt));
  const [usersActive] = await db
    .select({ c: sql<number>`count(distinct ${auditLog.actorUserId})::int` })
    .from(auditLog)
    .where(gte(auditLog.occurredAt, since30));
  const [meds] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(timelineEvent)
    .where(and(eq(timelineEvent.eventType, 'med'), gte(timelineEvent.occurredAt, since24)));
  const [audit] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(gte(auditLog.occurredAt, since24));
  const [members] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(membership)
    .where(and(eq(membership.status, 'active'), isNull(membership.deletedAt)));
  const [invites] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(invitation)
    .where(and(eq(invitation.status, 'pending'), isNull(invitation.deletedAt)));
  const incidents = await getOpenIncidentCount();

  logPlatformAccess(actor, 'platform_counts');
  return {
    circles: circles?.c ?? 0,
    users30d: usersActive?.c ?? 0,
    meds24h: meds?.c ?? 0,
    audit24h: audit?.c ?? 0,
    incidents,
    members: members?.c ?? 0,
    pendingInvites: invites?.c ?? 0,
  };
}

export type ActivityPoint = { day: string; events: number; logins: number };

/**
 * Per-day audit activity for the last `days` (default 14), zero-filled so the chart has a full
 * window. `events` = all audit rows that day; `logins` = sign-in rows. Day labels are UTC-stable.
 */
export async function getActivitySeries(actor: PlatformActor, days = 14): Promise<ActivityPoint[]> {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  const db = getPlatformDb();
  const eventDay = sql`date_trunc('day', ${auditLog.occurredAt})`;
  const loginDay = sql`date_trunc('day', ${platformAuthAudit.occurredAt})`;

  // `events` = all circle audit rows per day; `logins` = canonical per-user sign-ins from
  // `platform_auth_audit` (same source as the headline tile, so chart and tile agree).
  const [eventRows, loginRows] = await Promise.all([
    db
      .select({
        key: sql<string>`to_char(${eventDay}, 'YYYY-MM-DD')`,
        events: sql<number>`count(*)::int`,
      })
      .from(auditLog)
      .where(gte(auditLog.occurredAt, since))
      .groupBy(eventDay),
    safeAuthAudit<{ key: string; logins: number }[]>([], () =>
      db
        .select({
          key: sql<string>`to_char(${loginDay}, 'YYYY-MM-DD')`,
          logins: sql<number>`count(*)::int`,
        })
        .from(platformAuthAudit)
        .where(and(eq(platformAuthAudit.action, 'login'), gte(platformAuthAudit.occurredAt, since)))
        .groupBy(loginDay),
    ),
  ]);

  const eventsByKey = new Map(eventRows.map((r) => [r.key, r.events]));
  const loginsByKey = new Map(loginRows.map((r) => [r.key, r.logins]));
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const now = new Date();
  const series: ActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    series.push({ day: fmt.format(d), events: eventsByKey.get(key) ?? 0, logins: loginsByKey.get(key) ?? 0 });
  }
  logPlatformAccess(actor, 'activity_series');
  return series;
}

/** A timezone like "Asia/Manila" → a short region label "Manila". */
function regionFromTimezone(tz: string | null): string {
  if (!tz) return '—';
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

/** Relative "x min/hr/days ago" — deterministic enough for a server-rendered dynamic page. */
function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * The real tenant list across all circles: recipient, region, active member count, plan, last
 * activity, and a health flag (attention when an urgent/incident event hit in the last 24h).
 * Small N (a platform's circles) → a few grouped queries stitched in memory beats one mega-join.
 */
export async function getTenants(actor: PlatformActor): Promise<Tenant[]> {
  const db = getPlatformDb();
  const since24 = new Date(Date.now() - DAY_MS);

  const circles = await db
    .select({
      id: careCircle.id,
      name: careCircle.name,
      plan: careCircle.plan,
      tz: careCircle.primaryTimezone,
      recipient: careRecipientProfile.fullName,
    })
    .from(careCircle)
    .leftJoin(careRecipientProfile, eq(careRecipientProfile.circleId, careCircle.id))
    .where(isNull(careCircle.deletedAt))
    .orderBy(desc(careCircle.createdAt));

  const memberRows = await db
    .select({ circleId: membership.circleId, c: sql<number>`count(*)::int` })
    .from(membership)
    .where(and(eq(membership.status, 'active'), isNull(membership.deletedAt)))
    .groupBy(membership.circleId);
  const memberMap = new Map(memberRows.map((m) => [m.circleId, m.c]));

  const lastRows = await db
    .select({ circleId: timelineEvent.circleId, lastAt: sql<string>`max(${timelineEvent.occurredAt})` })
    .from(timelineEvent)
    .groupBy(timelineEvent.circleId);
  const lastMap = new Map(lastRows.map((l) => [l.circleId, new Date(l.lastAt)]));

  const attnRows = await db
    .selectDistinct({ circleId: timelineEvent.circleId })
    .from(timelineEvent)
    .where(
      and(
        gte(timelineEvent.occurredAt, since24),
        or(eq(timelineEvent.isUrgent, true), eq(timelineEvent.eventType, 'incident')),
      ),
    );
  const attnSet = new Set(attnRows.map((a) => a.circleId));

  logPlatformAccess(actor, 'tenants', { count: circles.length });
  return circles.map((c) => ({
    id: c.id,
    name: c.name,
    recipient: c.recipient ?? '—',
    region: regionFromTimezone(c.tz),
    members: memberMap.get(c.id) ?? 0,
    plan: c.plan === 'plus' ? 'Plus' : 'Free',
    lastActive: lastMap.has(c.id) ? formatRelative(lastMap.get(c.id)!) : 'No activity yet',
    status: attnSet.has(c.id) ? 'attention' : 'healthy',
  }));
}

/** Format a timestamp as HH:MM (24h, UTC-stable) — deterministic across server/client renders. */
function formatClock(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(d);
}
