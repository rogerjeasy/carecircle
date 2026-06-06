'use server';

/**
 * Lists the care circles the signed-in user actively belongs to — powers the sidebar's
 * "Switch Circle" menu.
 *
 * Security (see AGENTS.md):
 *  - Membership + circle are tenant data, read through `withAuthedDb()` (RLS-scoped), so a user
 *    can only ever see circles they actually belong to.
 *  - Operational `serverLog` only (listing your own circles is not a sensitive export).
 */
import { cookies } from 'next/headers';
import { and, asc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { getSessionUserId, withAuthedDb } from '@/db/dal';
import { membership, careCircle, users } from '@/db/schema';
import { ACTIVE_CIRCLE_COOKIE, resolveActiveMembership } from '@/lib/circle/active-circle';
import { dbRoleLabel } from '@/lib/circle/roles';
import { serverLog, maskEmail } from '@/lib/log';

export interface CircleSummary {
  id: string;
  name: string;
  /** Two-letter monogram for the circle avatar. */
  initials: string;
}

export interface CircleMember {
  userId: string;
  name: string;
  initials: string;
  roleLabel: string;
  image: string | null;
}

/** Derive a two-letter monogram from a circle name (e.g. "Antonio's Care" → "AC"). */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The user's active circles, primary first (earliest-joined — the same ordering
 * `getCurrentUser()` uses to resolve the default role). Empty array when unauthenticated.
 */
export async function getUserCircles(): Promise<CircleSummary[]> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  try {
    const rows = await withAuthedDb((tx) =>
      tx
        .select({ id: careCircle.id, name: careCircle.name })
        .from(membership)
        .innerJoin(careCircle, eq(careCircle.id, membership.circleId))
        .where(and(eq(membership.userId, userId), eq(membership.status, 'active')))
        .orderBy(asc(membership.createdAt)),
    );

    serverLog('circle', 'getUserCircles', 'success', {
      email: maskEmail(session.user?.email),
      count: rows.length,
    });
    return rows.map((r) => ({ id: r.id, name: r.name, initials: initialsFrom(r.name) }));
  } catch (err) {
    serverLog('circle', 'getUserCircles', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return [];
  }
}

/**
 * Switch the active circle. Fail-closed: the cookie is only written if the user is actually an
 * active member of `circleId` (so a forged request can't pivot into a circle they don't belong
 * to). Returns whether the switch was accepted; the client refreshes its data on success.
 */
export async function setActiveCircle(circleId: string): Promise<{ ok: boolean }> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false };

  const rows = await withAuthedDb((tx) =>
    tx
      .select({ id: membership.id })
      .from(membership)
      .where(
        and(
          eq(membership.userId, userId),
          eq(membership.circleId, circleId),
          eq(membership.status, 'active'),
        ),
      )
      .limit(1),
  );
  if (rows.length === 0) {
    serverLog('circle', 'setActiveCircle', 'failure', { reason: 'not_a_member' });
    return { ok: false };
  }

  const store = await cookies();
  store.set(ACTIVE_CIRCLE_COOKIE, circleId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  serverLog('circle', 'setActiveCircle', 'success', { circleId });
  return { ok: true };
}

/**
 * The members of the ACTIVE circle — i.e. only the people connected to this care recipient,
 * never users from other circles. Scoped to `active.circleId`, and RLS additionally guarantees
 * the caller is a member of that circle, so no other tenant's users can ever be returned.
 */
export async function getCircleMembers(): Promise<CircleMember[]> {
  const active = await resolveActiveMembership();
  if (!active) return [];

  try {
    const rows = await withAuthedDb((tx) =>
      tx
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          role: membership.role,
        })
        .from(membership)
        .innerJoin(users, eq(users.id, membership.userId))
        .where(and(eq(membership.circleId, active.circleId), eq(membership.status, 'active')))
        .orderBy(asc(membership.createdAt)),
    );

    serverLog('circle', 'getCircleMembers', 'success', { circleId: active.circleId, count: rows.length });
    return rows.map((r) => {
      const display = r.name?.trim() || r.email?.split('@')[0] || 'Member';
      return {
        userId: r.userId,
        name: display,
        initials: initialsFrom(display),
        roleLabel: dbRoleLabel(r.role),
        image: r.image ?? null,
      };
    });
  } catch (err) {
    serverLog('circle', 'getCircleMembers', 'failure', {
      circleId: active.circleId,
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return [];
  }
}
