import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { withUserContext } from './rls';
import {
  careCircle,
  careRecipientProfile,
  timelineEvent,
  membership,
  users,
} from './schema';

/**
 * Loads a circle overview THROUGH the RLS bridge.
 *
 * `DEMO_USER_ID` stands in for "the signed-in user" until real auth is wired:
 *   - on the admin connection it's effectively ignored (admin bypasses RLS),
 *   - on the carecircle_app connection it drives Row-Level Security, so the page
 *     only ever sees the circles that user belongs to.
 * Once Auth.js sessions are wired, swap `demoUserId` for the real session user id
 * (this becomes a `withAuthedDb()` call).
 */
export async function getDemoOverview() {
  const demoUserId = process.env.DEMO_USER_ID ?? '';

  return withUserContext(demoUserId, async (tx) => {
    const [circle] = await tx.select().from(careCircle).limit(1);
    if (!circle) return null;

    const [recipient] = await tx
      .select()
      .from(careRecipientProfile)
      .where(eq(careRecipientProfile.circleId, circle.id))
      .limit(1);

    const events = await tx
      .select({
        id: timelineEvent.id,
        summary: timelineEvent.summary,
        eventType: timelineEvent.eventType,
        occurredAt: timelineEvent.occurredAt,
        actorName: users.name,
      })
      .from(timelineEvent)
      .leftJoin(membership, eq(membership.id, timelineEvent.actorMembershipId))
      .leftJoin(users, eq(users.id, membership.userId))
      .where(eq(timelineEvent.circleId, circle.id))
      .orderBy(desc(timelineEvent.occurredAt))
      .limit(20);

    const members = await tx
      .select({
        id: membership.id,
        role: membership.role,
        label: membership.relationshipLabel,
        name: users.name,
      })
      .from(membership)
      .leftJoin(users, eq(users.id, membership.userId))
      .where(eq(membership.circleId, circle.id));

    return { circle, recipient, events, members };
  });
}
