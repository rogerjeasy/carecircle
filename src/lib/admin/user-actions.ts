'use server';

/**
 * Platform-admin user management actions (/admin/users) — edit a user's account info, change a
 * membership's role, suspend/reactivate, remove a membership, or delete the account entirely.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth, "Platform super-admin"):
 *  - Every action re-checks `requirePlatformAdmin()` itself — never trusts the page/layout ran.
 *  - Writes go through the privileged connection (these cross tenants by design), inside one
 *    transaction WITH their `audit_log` rows so the action and its trail commit atomically.
 *    (The actor is staff with no membership in the target circle, so the RLS insert path used by
 *    `recordAuditEvent` cannot apply here — same privileged-write precedent as src/lib/auth/demo.ts.)
 *  - Staff accounts (PLATFORM_ADMIN_EMAILS) cannot be edited or deleted from the console — the
 *    allowlist in env is their single source of truth, so a compromised admin session can't mint
 *    or destroy other admins. Changing a user's email TO an allowlisted address is blocked too.
 *  - A circle's last active owner can't be demoted/suspended/removed/deleted — that would orphan
 *    the tenant with no one able to manage it.
 *  - Inputs ride in FormData and are zod-validated; logs use `maskEmail()`/ids only (no raw PII).
 */
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/db/dal';
import { getPlatformDb } from '@/db/admin-db';
import { auditLog, membership, roleEnum, users, type auditActionEnum } from '@/db/schema';
import { serverLog, maskEmail } from '@/lib/log';
import { dbRoleLabel } from '@/lib/circle/roles';
import { isPlatformAdminEmail } from './access';

export type AdminActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const STAFF_LOCKED =
  'Platform staff accounts are managed via the PLATFORM_ADMIN_EMAILS allowlist, not the console.';
const LAST_OWNER =
  'This member is the last active owner of their circle — transfer ownership first.';

type Tx = Parameters<Parameters<ReturnType<typeof getPlatformDb>['transaction']>[0]>[0];
type AuditAction = (typeof auditActionEnum.enumValues)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Our own control-flow errors, safe to log/branch on. Anything else logs its name only. */
const KNOWN_FAILURES = new Set(['last_owner', 'staff_target', 'not_found']);

function failureCode(err: unknown): string {
  const msg = (err as Error)?.message;
  if (msg && KNOWN_FAILURES.has(msg)) return msg;
  return (err as Error)?.name ?? 'error';
}

/**
 * Append the privileged-path audit row inside the SAME transaction as the change it records.
 * `entityId` is a uuid column; user ids are text (uuids in practice) so non-uuids degrade to null
 * rather than failing the whole transaction.
 */
async function recordAdminAudit(
  tx: Tx,
  actorUserId: string,
  entry: { circleId: string; action: AuditAction; entityType: string; entityId?: string; summary: string },
): Promise<void> {
  await tx.insert(auditLog).values({
    circleId: entry.circleId,
    actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId && UUID_RE.test(entry.entityId) ? entry.entityId : null,
    summary: entry.summary,
  });
}

/** True when no OTHER active owner exists in the circle — the fail-closed "last owner" check. */
async function isLastActiveOwner(
  tx: Tx,
  m: { id: string; circleId: string; role: string },
): Promise<boolean> {
  if (m.role !== 'owner') return false;
  const [other] = await tx
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(
        eq(membership.circleId, m.circleId),
        eq(membership.role, 'owner'),
        eq(membership.status, 'active'),
        isNull(membership.deletedAt),
        ne(membership.id, m.id),
      ),
    )
    .limit(1);
  return !other;
}

// ---------------------------------------------------------------------------
// Update a user's account info (name / email)
// ---------------------------------------------------------------------------

const updateUserSchema = z.object({
  userId: z.string().min(1).max(64),
  name: z.string().trim().min(1, 'Name is required.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export async function adminUpdateUser(formData: FormData): Promise<AdminActionResult> {
  const admin = await requirePlatformAdmin();
  serverLog('admin', 'updateUser', 'start', { actor: admin.id });

  const parsed = updateUserSchema.safeParse({
    userId: formData.get('userId'),
    name: formData.get('name'),
    email: formData.get('email'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }
  const { userId, name, email } = parsed.data;

  // Console-minted admins are forbidden in BOTH directions: can't edit a staff account, and
  // can't point a normal account at an allowlisted address (that would grant /admin access).
  if (isPlatformAdminEmail(email)) {
    serverLog('admin', 'updateUser', 'failure', { actor: admin.id, reason: 'email_on_allowlist' });
    return { ok: false, error: 'That email address belongs to the platform staff allowlist.' };
  }

  try {
    const db = getPlatformDb();
    const [target] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) return { ok: false, error: 'User not found.' };
    if (isPlatformAdminEmail(target.email)) {
      serverLog('admin', 'updateUser', 'failure', { actor: admin.id, reason: 'staff_target' });
      return { ok: false, error: STAFF_LOCKED };
    }

    // One identity per email (case-insensitive), mirroring the sign-up constraint.
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(sql`lower(${users.email}) = ${email}`, ne(users.id, userId)))
      .limit(1);
    if (taken) return { ok: false, error: 'That email address is already in use.' };

    await db.transaction(async (tx) => {
      await tx.update(users).set({ name, email }).where(eq(users.id, userId));
      const circles = await tx
        .select({ circleId: membership.circleId })
        .from(membership)
        .where(and(eq(membership.userId, userId), isNull(membership.deletedAt)));
      for (const c of circles) {
        await recordAdminAudit(tx, admin.id, {
          circleId: c.circleId,
          action: 'update',
          entityType: 'user',
          entityId: userId,
          summary: 'Platform admin updated a member’s account info (name/email)',
        });
      }
    });

    serverLog('admin', 'updateUser', 'success', { actor: admin.id, target: userId, email: maskEmail(email) });
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    serverLog('admin', 'updateUser', 'failure', { actor: admin.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Change a membership's role or status (suspend / reactivate)
// ---------------------------------------------------------------------------

const setMembershipSchema = z
  .object({
    membershipId: z.string().uuid(),
    role: z.enum(roleEnum.enumValues).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .refine((v) => v.role || v.status, { message: 'Nothing to change.' });

export async function adminSetMembership(formData: FormData): Promise<AdminActionResult> {
  const admin = await requirePlatformAdmin();
  serverLog('admin', 'setMembership', 'start', { actor: admin.id });

  const parsed = setMembershipSchema.safeParse({
    membershipId: formData.get('membershipId'),
    role: formData.get('role') || undefined,
    status: formData.get('status') || undefined,
  });
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const { membershipId, role, status } = parsed.data;

  try {
    await getPlatformDb().transaction(async (tx) => {
      const [m] = await tx
        .select({
          id: membership.id,
          circleId: membership.circleId,
          role: membership.role,
          userId: membership.userId,
          email: users.email,
        })
        .from(membership)
        .innerJoin(users, eq(users.id, membership.userId))
        .where(and(eq(membership.id, membershipId), isNull(membership.deletedAt)))
        .limit(1);
      if (!m) throw new Error('not_found');
      if (isPlatformAdminEmail(m.email)) throw new Error('staff_target');

      // Demoting or suspending the only active owner would orphan the circle.
      const losesOwnership = (role && role !== 'owner' && m.role === 'owner') || status === 'suspended';
      if (losesOwnership && (await isLastActiveOwner(tx, m))) throw new Error('last_owner');

      await tx
        .update(membership)
        .set({
          ...(role ? { role } : {}),
          ...(status ? { status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(membership.id, membershipId));

      const summary = role
        ? `Platform admin changed a member’s role to ${dbRoleLabel(role)}`
        : status === 'suspended'
          ? 'Platform admin suspended a member'
          : 'Platform admin reactivated a member';
      await recordAdminAudit(tx, admin.id, {
        circleId: m.circleId,
        action: 'update',
        entityType: 'membership',
        entityId: membershipId,
        summary,
      });
    });

    serverLog('admin', 'setMembership', 'success', { actor: admin.id, id: membershipId, role: role ?? '-', status: status ?? '-' });
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    const reason = failureCode(err);
    serverLog('admin', 'setMembership', 'failure', { actor: admin.id, reason });
    if (reason === 'last_owner') return { ok: false, error: LAST_OWNER };
    if (reason === 'staff_target') return { ok: false, error: STAFF_LOCKED };
    if (reason === 'not_found') return { ok: false, error: 'Membership not found.' };
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Remove a membership (take the user out of one circle, account stays)
// ---------------------------------------------------------------------------

export async function adminRemoveMembership(formData: FormData): Promise<AdminActionResult> {
  const admin = await requirePlatformAdmin();
  serverLog('admin', 'removeMembership', 'start', { actor: admin.id });

  const parsed = z.string().uuid().safeParse(formData.get('membershipId'));
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const membershipId = parsed.data;

  try {
    await getPlatformDb().transaction(async (tx) => {
      const [m] = await tx
        .select({
          id: membership.id,
          circleId: membership.circleId,
          role: membership.role,
          email: users.email,
        })
        .from(membership)
        .innerJoin(users, eq(users.id, membership.userId))
        .where(and(eq(membership.id, membershipId), isNull(membership.deletedAt)))
        .limit(1);
      if (!m) throw new Error('not_found');
      if (isPlatformAdminEmail(m.email)) throw new Error('staff_target');
      if (await isLastActiveOwner(tx, m)) throw new Error('last_owner');

      // Soft delete, matching the in-app "remove member" semantics (people/actions.ts).
      await tx
        .update(membership)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(membership.id, membershipId));
      await recordAdminAudit(tx, admin.id, {
        circleId: m.circleId,
        action: 'delete',
        entityType: 'membership',
        entityId: membershipId,
        summary: 'Platform admin removed a member from the circle',
      });
    });

    serverLog('admin', 'removeMembership', 'success', { actor: admin.id, id: membershipId });
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    const reason = failureCode(err);
    serverLog('admin', 'removeMembership', 'failure', { actor: admin.id, reason });
    if (reason === 'last_owner') return { ok: false, error: LAST_OWNER };
    if (reason === 'staff_target') return { ok: false, error: STAFF_LOCKED };
    if (reason === 'not_found') return { ok: false, error: 'Membership not found.' };
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Delete the entire account
// ---------------------------------------------------------------------------

export async function adminDeleteUser(formData: FormData): Promise<AdminActionResult> {
  const admin = await requirePlatformAdmin();
  serverLog('admin', 'deleteUser', 'start', { actor: admin.id });

  const parsed = z.string().min(1).max(64).safeParse(formData.get('userId'));
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const userId = parsed.data;

  try {
    await getPlatformDb().transaction(async (tx) => {
      const [target] = await tx
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!target) throw new Error('not_found');
      // Covers self-deletion too — the acting admin is on the allowlist by definition.
      if (isPlatformAdminEmail(target.email)) throw new Error('staff_target');

      const circles = await tx
        .select({ circleId: membership.circleId, id: membership.id, role: membership.role })
        .from(membership)
        .where(and(eq(membership.userId, userId), eq(membership.status, 'active'), isNull(membership.deletedAt)));
      for (const m of circles) {
        if (await isLastActiveOwner(tx, m)) throw new Error('last_owner');
      }

      // Audit rows first (they have no FK to the user), then the hard delete — `user` cascades
      // to memberships, sessions, OAuth accounts, and password-reset tokens in one stroke.
      for (const m of circles) {
        await recordAdminAudit(tx, admin.id, {
          circleId: m.circleId,
          action: 'delete',
          entityType: 'user',
          entityId: userId,
          summary: 'Platform admin deleted a member’s account',
        });
      }
      await tx.delete(users).where(eq(users.id, userId));
    });

    serverLog('admin', 'deleteUser', 'success', { actor: admin.id, target: userId });
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (err) {
    const reason = failureCode(err);
    serverLog('admin', 'deleteUser', 'failure', { actor: admin.id, reason });
    if (reason === 'last_owner')
      return { ok: false, error: 'This user is the last active owner of a circle — transfer ownership (or delete the circle) first.' };
    if (reason === 'staff_target') return { ok: false, error: STAFF_LOCKED };
    if (reason === 'not_found') return { ok: false, error: 'User not found.' };
    return { ok: false, error: GENERIC_ERROR };
  }
}
