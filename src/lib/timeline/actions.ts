'use server';

/**
 * Timeline server actions — posting notes, commenting, reacting, and paging older events.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Each action re-checks `requireSession()` and re-authorizes against the user's REAL membership
 *    role in the active circle (never the client's claim). The RLS policies (drizzle/0011) are the
 *    final backstop.
 *  - All writes run through `withAuthedDb()` (RLS-scoped) and are audited via `recordAuditEvent()`.
 *  - A note's body can be free-text PII, so `postNote`/`addComment` take FormData (Next's dev logger
 *    never prints FormData contents); logs carry ids/counts/reasons, never the body.
 */
import { after } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { timelineEvent, timelineComment, timelineReaction, membership } from '@/db/schema';
import { ingestTimelineById } from '@/lib/rag/ingest';
import { canContribute, canPostPrivate } from './access';
import { getTimelineData } from './queries';
import { authorColorFor, initialsFrom } from '@/components/timeline/utils';
import type { TimelineComment, TimelineEvent, Visibility } from '@/components/timeline/types';

export type ActionError = { ok: false; error: string };
const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';

interface ActorContext {
  userId: string;
  name: string | null | undefined;
  circleId: string;
  membershipId: string;
  role: string;
}

/** Resolve the signed-in user's membership in their active circle (null if none). */
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
  return { userId: user.id, name: user.name, circleId, membershipId: m.id, role: m.role };
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Someone';
}

/** FE visibility → DB visibility, clamping "private" to "family_only" if the role can't post private. */
function toDbVisibility(v: Visibility, canPrivate: boolean): 'all' | 'family_only' | 'private' {
  if (v === 'private') return canPrivate ? 'private' : 'family_only';
  if (v === 'family') return 'family_only';
  return 'all';
}
function toFeVisibility(v: 'all' | 'family_only' | 'private'): Visibility {
  if (v === 'private') return 'private';
  if (v === 'family_only') return 'family';
  return 'everyone';
}

// ---------------------------------------------------------------------------

const postNoteSchema = z.object({
  text: z.string().trim().min(1, 'Write something to share').max(2000),
  visibility: z.enum(['everyone', 'family', 'private']),
});

export type PostNoteResult = { ok: true; data: TimelineEvent } | ActionError;

/** Post a free-text note to the timeline. Returns the created event for instant reconciliation. */
export async function postNote(formData: FormData): Promise<PostNoteResult> {
  const ctx = await getActorContext();
  serverLog('timeline', 'postNote', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canContribute(ctx.role)) {
    serverLog('timeline', 'postNote', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const parsed = postNoteSchema.safeParse({
    text: formData.get('text')?.toString() ?? '',
    visibility: formData.get('visibility')?.toString() ?? 'everyone',
  });
  if (!parsed.success) {
    serverLog('timeline', 'postNote', 'failure', { actor: ctx.userId, reason: 'validation' });
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check your note.' };
  }

  const dbVis = toDbVisibility(parsed.data.visibility, canPostPrivate(ctx.role));
  const summary = `${firstName(ctx.name)} added a note`;

  try {
    const row = await withAuthedDb(async (tx) => {
      const [inserted] = await tx
        .insert(timelineEvent)
        .values({
          circleId: ctx.circleId,
          actorMembershipId: ctx.membershipId,
          eventType: 'note',
          summary,
          visibility: dbVis,
          payload: { body: parsed.data.text },
        })
        .returning({ id: timelineEvent.id, occurredAt: timelineEvent.occurredAt });

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'timeline_event', entityId: inserted.id, summary: `Posted a ${dbVis} note` },
        tx,
      );
      return inserted;
    });

    // Index the note into the vector store after the response is sent.
    after(() => ingestTimelineById(row.id, { userId: ctx.userId, circleId: ctx.circleId }));

    const name = ctx.name?.trim() || 'You';
    const dto: TimelineEvent = {
      id: row.id,
      type: 'note',
      summary,
      details: parsed.data.text,
      authorName: name,
      authorInitials: initialsFrom(name),
      authorColor: authorColorFor(ctx.userId),
      timestamp: row.occurredAt,
      visibility: toFeVisibility(dbVis),
      comments: [],
      reactions: [],
    };

    serverLog('timeline', 'postNote', 'success', { actor: ctx.userId, id: row.id });
    return { ok: true, data: dto };
  } catch (err) {
    serverLog('timeline', 'postNote', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------

const addCommentSchema = z.object({
  eventId: z.string().uuid(),
  text: z.string().trim().min(1).max(1000),
});

export type AddCommentResult = { ok: true; data: TimelineComment } | ActionError;

/** Add a comment to a timeline event. Returns the created comment for instant reconciliation. */
export async function addComment(formData: FormData): Promise<AddCommentResult> {
  const ctx = await getActorContext();
  serverLog('timeline', 'addComment', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canContribute(ctx.role)) return { ok: false, error: FORBIDDEN };

  const parsed = addCommentSchema.safeParse({
    eventId: formData.get('eventId')?.toString() ?? '',
    text: formData.get('text')?.toString() ?? '',
  });
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    const row = await withAuthedDb(async (tx) => {
      // Confirm the event is in the active circle (RLS also enforces this).
      const [ev] = await tx
        .select({ id: timelineEvent.id })
        .from(timelineEvent)
        .where(and(eq(timelineEvent.id, parsed.data.eventId), eq(timelineEvent.circleId, ctx.circleId)))
        .limit(1);
      if (!ev) throw new Error('not_found_or_forbidden');

      const [inserted] = await tx
        .insert(timelineComment)
        .values({
          circleId: ctx.circleId,
          timelineEventId: parsed.data.eventId,
          authorMembershipId: ctx.membershipId,
          body: parsed.data.text,
        })
        .returning({ id: timelineComment.id, createdAt: timelineComment.createdAt });

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'timeline_comment', entityId: parsed.data.eventId, summary: 'Commented on a timeline event' },
        tx,
      );
      return inserted;
    });

    const name = ctx.name?.trim() || 'You';
    const dto: TimelineComment = {
      id: row.id,
      authorName: name,
      authorInitials: initialsFrom(name),
      authorColor: authorColorFor(ctx.userId),
      text: parsed.data.text,
      timestamp: row.createdAt,
    };

    serverLog('timeline', 'addComment', 'success', { actor: ctx.userId, id: row.id });
    return { ok: true, data: dto };
  } catch (err) {
    serverLog('timeline', 'addComment', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------

export type ToggleReactionResult = { ok: true; reacted: boolean } | ActionError;

/** Toggle the current user's heart on an event. Returns the new state for reconciliation. */
export async function toggleReaction(eventId: string): Promise<ToggleReactionResult> {
  const ctx = await getActorContext();
  serverLog('timeline', 'toggleReaction', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canContribute(ctx.role)) return { ok: false, error: FORBIDDEN };

  const id = z.string().uuid().safeParse(eventId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    const reacted = await withAuthedDb(async (tx) => {
      const [existing] = await tx
        .select({ id: timelineReaction.id })
        .from(timelineReaction)
        .where(
          and(
            eq(timelineReaction.timelineEventId, id.data),
            eq(timelineReaction.membershipId, ctx.membershipId),
          ),
        )
        .limit(1);

      if (existing) {
        await tx.delete(timelineReaction).where(eq(timelineReaction.id, existing.id));
        await recordAuditEvent(
          ctx.userId,
          { circleId: ctx.circleId, action: 'delete', entityType: 'timeline_reaction', entityId: id.data, summary: 'Removed a reaction' },
          tx,
        );
        return false;
      }

      // Confirm the event is in the active circle before reacting (RLS also enforces this).
      const [ev] = await tx
        .select({ id: timelineEvent.id })
        .from(timelineEvent)
        .where(and(eq(timelineEvent.id, id.data), eq(timelineEvent.circleId, ctx.circleId)))
        .limit(1);
      if (!ev) throw new Error('not_found_or_forbidden');

      await tx.insert(timelineReaction).values({
        circleId: ctx.circleId,
        timelineEventId: id.data,
        membershipId: ctx.membershipId,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'timeline_reaction', entityId: id.data, summary: 'Reacted to a timeline event' },
        tx,
      );
      return true;
    });

    serverLog('timeline', 'toggleReaction', 'success', { actor: ctx.userId, reacted });
    return { ok: true, reacted };
  } catch (err) {
    serverLog('timeline', 'toggleReaction', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------

export type LoadMoreResult = { ok: true; events: TimelineEvent[]; hasMore: boolean } | ActionError;

/** Page older events (before the given occurredAt ISO). */
export async function loadMoreTimeline(beforeISO: string): Promise<LoadMoreResult> {
  const when = z.string().datetime().safeParse(beforeISO);
  if (!when.success) return { ok: false, error: GENERIC_ERROR };
  const data = await getTimelineData(when.data);
  if (!data) return { ok: false, error: 'No active care circle.' };
  return { ok: true, events: data.events, hasMore: data.hasMore };
}
