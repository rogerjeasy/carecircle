import 'server-only';

/**
 * Read layer for the Timeline — turns the activity-stream rows (timeline_event + timeline_comment
 * + timeline_reaction) into the exact shape the client feed renders (`TimelineEvent`).
 *
 * Security (see AGENTS.md):
 *  - All reads go through `withAuthedDb()` (RLS-scoped) AND are pinned to the user's ACTIVE circle.
 *  - The timeline_event RLS policy already hides other members' `private` events; we never re-expose
 *    them here. Reading one's own circle's feed is normal app data → operational `serverLog` only.
 */
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import {
  timelineEvent,
  timelineComment,
  timelineReaction,
  membership,
  users,
} from '@/db/schema';
import { authorColorFor, initialsFrom } from '@/components/timeline/utils';
import type { EventType, TimelineData, TimelineEvent, Visibility } from '@/components/timeline/types';

/** How many events make up one page (matches the "Load earlier updates" cadence). */
export const TIMELINE_PAGE_SIZE = 20;

/** DB timeline_event_type → the feed's narrower vocabulary (extras fold into "note"). */
function mapEventType(dbType: string): EventType {
  switch (dbType) {
    case 'med':
    case 'vital':
    case 'appointment':
    case 'incident':
    case 'note':
      return dbType;
    default:
      return 'note'; // task / document / system → shown as a note
  }
}

/** DB visibility → the feed's three tiers. */
function mapVisibility(dbVis: string): Visibility {
  if (dbVis === 'private') return 'private';
  if (dbVis === 'all') return 'everyone';
  return 'family'; // family_only + clinical
}

interface EventPayload {
  body?: string;
  photoUrl?: string;
}

/**
 * Load one page of the active circle's timeline. `beforeISO` (an event's occurredAt) pages older;
 * omit it for the newest page. Returns `null` if unauthenticated / no active circle.
 */
export async function getTimelineData(beforeISO?: string): Promise<TimelineData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('timeline', 'getTimelineData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const before = beforeISO ? new Date(beforeISO) : null;

    const data = await withAuthedDb(async (tx) => {
      // One extra row tells us whether an older page exists.
      const rows = await tx
        .select({
          id: timelineEvent.id,
          eventType: timelineEvent.eventType,
          summary: timelineEvent.summary,
          occurredAt: timelineEvent.occurredAt,
          visibility: timelineEvent.visibility,
          isUrgent: timelineEvent.isUrgent,
          payload: timelineEvent.payload,
          actorUserId: users.id,
          actorName: users.name,
        })
        .from(timelineEvent)
        .leftJoin(membership, eq(membership.id, timelineEvent.actorMembershipId))
        .leftJoin(users, eq(users.id, membership.userId))
        .where(
          before
            ? and(eq(timelineEvent.circleId, circleId), lt(timelineEvent.occurredAt, before))
            : eq(timelineEvent.circleId, circleId),
        )
        .orderBy(desc(timelineEvent.occurredAt))
        .limit(TIMELINE_PAGE_SIZE + 1);

      const hasMore = rows.length > TIMELINE_PAGE_SIZE;
      const pageRows = hasMore ? rows.slice(0, TIMELINE_PAGE_SIZE) : rows;
      const eventIds = pageRows.map((r) => r.id);

      const comments = eventIds.length
        ? await tx
            .select({
              id: timelineComment.id,
              eventId: timelineComment.timelineEventId,
              body: timelineComment.body,
              createdAt: timelineComment.createdAt,
              authorUserId: users.id,
              authorName: users.name,
            })
            .from(timelineComment)
            .leftJoin(membership, eq(membership.id, timelineComment.authorMembershipId))
            .leftJoin(users, eq(users.id, membership.userId))
            .where(inArray(timelineComment.timelineEventId, eventIds))
            .orderBy(timelineComment.createdAt)
        : [];

      const reactions = eventIds.length
        ? await tx
            .select({
              eventId: timelineReaction.timelineEventId,
              reactorUserId: users.id,
            })
            .from(timelineReaction)
            .leftJoin(membership, eq(membership.id, timelineReaction.membershipId))
            .leftJoin(users, eq(users.id, membership.userId))
            .where(inArray(timelineReaction.timelineEventId, eventIds))
        : [];

      return { pageRows, hasMore, comments, reactions };
    });

    const commentsByEvent = new Map<string, TimelineEvent['comments']>();
    for (const c of data.comments) {
      const name = c.authorName ?? 'Someone';
      const list = commentsByEvent.get(c.eventId) ?? [];
      list.push({
        id: c.id,
        authorName: name,
        authorInitials: initialsFrom(name),
        authorColor: authorColorFor(c.authorUserId ?? c.id),
        text: c.body,
        timestamp: c.createdAt,
      });
      commentsByEvent.set(c.eventId, list);
    }

    const reactionsByEvent = new Map<string, TimelineEvent['reactions']>();
    for (const r of data.reactions) {
      if (!r.reactorUserId) continue;
      const list = reactionsByEvent.get(r.eventId) ?? [];
      list.push({ userId: r.reactorUserId, type: 'heart' });
      reactionsByEvent.set(r.eventId, list);
    }

    const events: TimelineEvent[] = data.pageRows.map((r) => {
      const payload = (r.payload ?? {}) as EventPayload;
      const name = r.actorName ?? 'Kintwadi';
      return {
        id: r.id,
        type: mapEventType(r.eventType),
        summary: r.summary,
        details: payload.body || undefined,
        authorName: name,
        authorInitials: r.actorName ? initialsFrom(name) : 'CC',
        authorColor: authorColorFor(r.actorUserId ?? 'system'),
        timestamp: r.occurredAt,
        photoUrl: payload.photoUrl || undefined,
        visibility: mapVisibility(r.visibility),
        isUrgent: r.isUrgent || undefined,
        comments: commentsByEvent.get(r.id) ?? [],
        reactions: reactionsByEvent.get(r.id) ?? [],
      };
    });

    serverLog('timeline', 'getTimelineData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      events: events.length,
      more: data.hasMore,
    });

    return { circleId, events, hasMore: data.hasMore };
  } catch (err) {
    serverLog('timeline', 'getTimelineData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
