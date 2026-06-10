'use server';

/**
 * Care-circle settings — read + manage the active circle itself (name, ownership, lifecycle).
 *
 * Security (see AGENTS.md — fail-closed): every action re-checks `requireSession()` and the user's
 * REAL role in the active circle. Renaming is owner/family_admin; transferring ownership and deleting
 * the circle are owner-only. Everything runs through `withAuthedDb()` (the care_circle / membership
 * RLS policies are the final backstop) and is audited.
 */
import { z } from 'zod';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { recordAuditEvent } from '@/db/audit';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { dbRoleLabel } from '@/lib/circle/roles';
import { serverLog } from '@/lib/log';
import { careCircle, careRecipientProfile, membership, users } from '@/db/schema';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';
const NO_CIRCLE = 'No active care circle.';

const MANAGE_ROLES = new Set(['owner', 'family_admin']);

interface ActorContext {
  userId: string;
  circleId: string;
  membershipId: string;
  role: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ id: membership.id, role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.circleId, circleId),
          eq(membership.userId, user.id),
          eq(membership.status, 'active'),
          isNull(membership.deletedAt),
        ),
      )
      .limit(1),
  );
  if (!m) return null;
  return { userId: user.id, circleId, membershipId: m.id, role: m.role };
}

export interface CircleSettingsMember {
  membershipId: string;
  name: string;
  roleLabel: string;
  isCurrentUser: boolean;
}

export interface CircleSettings {
  circleId: string;
  name: string;
  recipientName: string | null;
  plan: string;
  /** May edit circle name (owner/family_admin). */
  canManage: boolean;
  /** Owner-only powers (transfer ownership, delete circle). */
  isOwner: boolean;
  /** Other active members — the candidates for an ownership transfer. */
  members: CircleSettingsMember[];
}

export type LoadCircleResult = { ok: true; settings: CircleSettings } | { ok: false; error: string };

/** Load the active circle's settings + members. */
export async function loadCircleSettings(): Promise<LoadCircleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  try {
    const data = await withAuthedDb(async (tx) => {
      const [circle] = await tx
        .select({ name: careCircle.name, plan: careCircle.plan })
        .from(careCircle)
        .where(eq(careCircle.id, ctx.circleId))
        .limit(1);
      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, ctx.circleId))
        .limit(1);
      const memberRows = await tx
        .select({ id: membership.id, userId: membership.userId, role: membership.role, name: users.name, email: users.email })
        .from(membership)
        .leftJoin(users, eq(users.id, membership.userId))
        .where(and(eq(membership.circleId, ctx.circleId), eq(membership.status, 'active'), isNull(membership.deletedAt)))
        .orderBy(asc(membership.createdAt));
      return { circle, recipient, memberRows };
    });

    const members: CircleSettingsMember[] = data.memberRows
      .filter((m) => m.userId !== ctx.userId)
      .map((m) => ({
        membershipId: m.id,
        name: m.name ?? m.email ?? 'Member',
        roleLabel: dbRoleLabel(m.role),
        isCurrentUser: false,
      }));

    serverLog('circle', 'loadSettings', 'success', { actor: ctx.userId });
    return {
      ok: true,
      settings: {
        circleId: ctx.circleId,
        name: data.circle?.name ?? '',
        recipientName: data.recipient?.fullName ?? null,
        plan: data.circle?.plan ?? 'free',
        canManage: MANAGE_ROLES.has(ctx.role),
        isOwner: ctx.role === 'owner',
        members,
      },
    };
  } catch (err) {
    serverLog('circle', 'loadSettings', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** Rename the active circle (owner / family_admin). */
export async function renameCircle(name: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('circle', 'rename', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (!MANAGE_ROLES.has(ctx.role)) return { ok: false, error: FORBIDDEN };
  const parsed = z.string().trim().min(1, 'Please enter a circle name').max(120).safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      await tx.update(careCircle).set({ name: parsed.data, updatedAt: new Date() }).where(eq(careCircle.id, ctx.circleId));
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'circle', entityId: ctx.circleId, summary: 'Renamed the care circle' },
        tx,
      );
    });
    serverLog('circle', 'rename', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('circle', 'rename', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Transfer coordinator (owner) duties to another active member (owner only). */
export async function transferOwnership(toMembershipId: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('circle', 'transferOwnership', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (ctx.role !== 'owner') return { ok: false, error: FORBIDDEN };
  const id = z.string().uuid().safeParse(toMembershipId);
  if (!id.success || id.data === ctx.membershipId) return { ok: false, error: GENERIC_ERROR };

  try {
    const done = await withAuthedDb(async (tx) => {
      const [target] = await tx
        .select({ id: membership.id })
        .from(membership)
        .where(
          and(
            eq(membership.id, id.data),
            eq(membership.circleId, ctx.circleId),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
          ),
        )
        .limit(1);
      if (!target) return false;

      // Promote the target to owner, demote self to family_admin, repoint the circle's owner pointer.
      await tx.update(membership).set({ role: 'owner', updatedAt: new Date() }).where(eq(membership.id, target.id));
      await tx.update(membership).set({ role: 'family_admin', updatedAt: new Date() }).where(eq(membership.id, ctx.membershipId));
      await tx.update(careCircle).set({ ownerMembershipId: target.id, updatedAt: new Date() }).where(eq(careCircle.id, ctx.circleId));
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'circle', entityId: ctx.circleId, summary: 'Transferred circle ownership' },
        tx,
      );
      return true;
    });
    if (!done) return { ok: false, error: 'That member is no longer in the circle.' };
    serverLog('circle', 'transferOwnership', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('circle', 'transferOwnership', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Delete the active circle (owner only) — a soft delete (`deleted_at`). The circle immediately
 * disappears from every member's switcher and can no longer be resolved as active (see
 * getUserCircles / resolveActiveMembership), so its data is no longer reachable in the app.
 */
export async function deleteCircle(): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('circle', 'delete', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (ctx.role !== 'owner') return { ok: false, error: FORBIDDEN };

  try {
    await withAuthedDb(async (tx) => {
      await tx.update(careCircle).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(careCircle.id, ctx.circleId));
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'circle', entityId: ctx.circleId, summary: 'Deleted the care circle' },
        tx,
      );
    });
    serverLog('circle', 'delete', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('circle', 'delete', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
