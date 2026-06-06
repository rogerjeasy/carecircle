import 'server-only';

/**
 * The "active circle" — which care circle the signed-in user is currently acting in.
 *
 * It is stored in an httpOnly cookie and is the single source of truth that circle-scoped reads
 * (role, recipient, members, …) resolve through, so switching circles in the UI genuinely changes
 * what the whole app shows.
 *
 * Security (see AGENTS.md — fail-closed, per-user isolation):
 *  - The cookie is NEVER trusted on its own. We load the user's OWN active memberships under RLS
 *    (filtered to `userId`, so we never read other members' rows) and only honor the cookie if it
 *    names one of them. An attacker-set cookie pointing at a circle the user doesn't belong to is
 *    silently ignored and we fall back to their primary (earliest-joined) circle.
 *  - Resolution is read-only; writing the cookie happens in the `setActiveCircle` server action.
 */
import { cookies } from 'next/headers';
import { and, asc, eq } from 'drizzle-orm';
import { getSessionUserId, withAuthedDb } from '@/db/dal';
import { membership, careCircle } from '@/db/schema';

export const ACTIVE_CIRCLE_COOKIE = 'cc_active_circle';

export interface ActiveMembership {
  circleId: string;
  circleName: string;
  /** DB role enum value for THIS user in the active circle. */
  role: string;
}

/**
 * Resolve the user's active membership: the circle named by the cookie if they belong to it,
 * else their primary circle. Returns null if the user is unauthenticated or has no circle yet.
 */
export async function resolveActiveMembership(): Promise<ActiveMembership | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const store = await cookies();
  const requested = store.get(ACTIVE_CIRCLE_COOKIE)?.value ?? null;

  // The user's OWN memberships only (filtered by userId) — the membership RLS policy would also
  // expose co-members of the same circles, which we must not mistake for the current user.
  const rows = await withAuthedDb((tx) =>
    tx
      .select({
        circleId: membership.circleId,
        circleName: careCircle.name,
        role: membership.role,
      })
      .from(membership)
      .innerJoin(careCircle, eq(careCircle.id, membership.circleId))
      .where(and(eq(membership.userId, userId), eq(membership.status, 'active')))
      .orderBy(asc(membership.createdAt)),
  );

  if (rows.length === 0) return null;

  // Honor the cookie only if it matches a real membership (fail-closed); else primary circle.
  const chosen = (requested && rows.find((r) => r.circleId === requested)) || rows[0];
  return { circleId: chosen.circleId, circleName: chosen.circleName, role: chosen.role };
}

/** Just the active circle id (validated), or null. */
export async function getActiveCircleId(): Promise<string | null> {
  return (await resolveActiveMembership())?.circleId ?? null;
}
