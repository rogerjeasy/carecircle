/**
 * Append-only audit logging — the traceability backbone.
 *
 * Writes go to the immutable `audit_log` table (no UPDATE/DELETE policy exists), giving
 * CareCircle medical-grade accountability: who did what, to which entity, when.
 *
 * 🔒 PROJECT RULE: every sensitive/state-changing action MUST be audited. When you build a new
 * feature (give a medication, edit meds, view/export a document, invite a member, change a role,
 * report an incident, …), call `recordAuditEvent()` inside the same flow. See AGENTS.md.
 *
 * All writes run inside the actor's RLS context so each insert satisfies the `audit_insert`
 * policy (circle_id must be one of the user's circles). These helpers NEVER throw — an audit
 * failure must not block the action being audited.
 */
import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { withUserContext, type Tx } from './rls';
import { membership, auditLog, auditActionEnum } from './schema';

export type AuditAction = (typeof auditActionEnum.enumValues)[number];

type AuditEntry = {
  circleId: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  summary?: string;
  requestId?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  credentials: 'email & password',
  google: 'Google',
  apple: 'Apple',
};

/** Low-level insert (assumes RLS context is already set by the caller's transaction). */
async function insertAudit(tx: Tx, userId: string, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({
    circleId: entry.circleId,
    actorUserId: userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: entry.summary,
    requestId: entry.requestId,
  });
}

/**
 * Record one circle-scoped audit entry. This is the primitive every feature should call for
 * sensitive actions (create/update/delete/read/export/invite) once it knows the circle.
 *
 * Pass an existing `tx` to make the audit part of the SAME transaction as the action it
 * records (recommended for atomicity — e.g. the "give a medication" transaction). Omit it to
 * write in its own RLS-scoped transaction.
 */
export async function recordAuditEvent(
  userId: string,
  entry: AuditEntry,
  tx?: Tx,
): Promise<void> {
  try {
    if (tx) {
      await insertAudit(tx, userId, entry);
    } else {
      await withUserContext(userId, (t) => insertAudit(t, userId, entry));
    }
  } catch (err) {
    console.error('[audit] failed to record event:', (err as Error)?.name ?? 'error');
  }
}

/**
 * Auth events aren't tied to a single circle, so we fan out: one row per circle the user
 * actively belongs to, so each circle's owner/admin sees when a member accessed the record.
 * A brand-new user with no circle yet records nothing.
 */
async function fanOutAuthEvent(userId: string, action: AuditAction, summary: string): Promise<void> {
  try {
    await withUserContext(userId, async (tx) => {
      const memberships = await tx
        .select({ id: membership.id, circleId: membership.circleId })
        .from(membership)
        .where(
          and(
            eq(membership.userId, userId),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
          ),
        );

      if (memberships.length === 0) return;

      await tx.insert(auditLog).values(
        memberships.map((m) => ({
          circleId: m.circleId,
          actorUserId: userId,
          actorMembershipId: m.id,
          action,
          entityType: 'session',
          summary,
        })),
      );
    });
  } catch (err) {
    console.error('[audit] failed to record auth event:', (err as Error)?.name ?? 'error');
  }
}

/** Record a successful sign-in across all of the user's circles. */
export function recordLoginEvent(userId: string, provider?: string): Promise<void> {
  const label = provider ? PROVIDER_LABELS[provider] ?? provider : undefined;
  return fanOutAuthEvent(userId, 'login', label ? `Signed in via ${label}` : 'Signed in');
}

/** Record a sign-out across all of the user's circles. */
export function recordLogoutEvent(userId: string): Promise<void> {
  return fanOutAuthEvent(userId, 'logout', 'Signed out');
}
