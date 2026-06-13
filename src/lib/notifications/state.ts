'use server';

/**
 * Per-member notification read / dismissed state — the server side of the bell's "Mark read",
 * "Mark all read" and "Dismiss". State lives in `notification_state`, one row per (member, timeline
 * event), so it syncs across all of a member's devices (replacing the old per-browser localStorage).
 *
 * Security (see AGENTS.md): re-checks `requireSession()`; every write goes through `withAuthedDb()`
 * so RLS pins it to the caller's OWN membership, and we only ever touch events that belong to the
 * active circle. Logs ids/counts only. State changes are personal UI prefs → operational log, no
 * audit-ledger row.
 */
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { membership, notificationState, timelineEvent } from '@/db/schema';
import type { Tx } from '@/db/rls';

export type SimpleResult = { ok: true } | { ok: false; error: string };
const GENERIC_ERROR = 'Something went wrong. Please try again.';

interface ActorContext {
  userId: string;
  circleId: string;
  membershipId: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ id: membership.id })
      .from(membership)
      .where(and(eq(membership.circleId, circleId), eq(membership.userId, user.id), eq(membership.status, 'active')))
      .limit(1),
  );
  if (!m) return null;
  return { userId: user.id, circleId, membershipId: m.id };
}

const idSchema = z.string().uuid();
const idsSchema = z.array(z.string().uuid()).max(200);

/** Upsert state for the given events — but ONLY those that really belong to the active circle. */
async function upsertState(
  tx: Tx,
  ctx: ActorContext,
  eventIds: string[],
  patch: { readAt?: Date; dismissedAt?: Date },
): Promise<void> {
  if (eventIds.length === 0) return;
  const valid = await tx
    .select({ id: timelineEvent.id })
    .from(timelineEvent)
    .where(and(eq(timelineEvent.circleId, ctx.circleId), inArray(timelineEvent.id, eventIds)));
  if (valid.length === 0) return;
  const now = new Date();
  await tx
    .insert(notificationState)
    .values(
      valid.map((v) => ({
        circleId: ctx.circleId,
        membershipId: ctx.membershipId,
        timelineEventId: v.id,
        ...patch,
      })),
    )
    .onConflictDoUpdate({
      target: [notificationState.membershipId, notificationState.timelineEventId],
      set: { ...patch, updatedAt: now },
    });
}

/** Mark a single notification (timeline event) read for the caller. */
export async function markNotificationRead(eventId: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const id = idSchema.safeParse(eventId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };
  try {
    await withAuthedDb((tx) => upsertState(tx, ctx, [id.data], { readAt: new Date() }));
    serverLog('notifications', 'markRead', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('notifications', 'markRead', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Mark several notifications read at once ("Mark all read" sends the currently-shown ids). */
export async function markAllNotificationsRead(eventIds: string[]): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const ids = idsSchema.safeParse(eventIds);
  if (!ids.success) return { ok: false, error: GENERIC_ERROR };
  try {
    await withAuthedDb((tx) => upsertState(tx, ctx, ids.data, { readAt: new Date() }));
    serverLog('notifications', 'markAllRead', 'success', { actor: ctx.userId, count: ids.data.length });
    return { ok: true };
  } catch (err) {
    serverLog('notifications', 'markAllRead', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Dismiss a notification for the caller (hides it from their feed everywhere). */
export async function dismissNotification(eventId: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const id = idSchema.safeParse(eventId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };
  try {
    await withAuthedDb((tx) => upsertState(tx, ctx, [id.data], { dismissedAt: new Date() }));
    serverLog('notifications', 'dismiss', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('notifications', 'dismiss', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export interface EventState {
  read: boolean;
  dismissed: boolean;
}

/**
 * Load the caller's read/dismissed state for a set of events → keyed by event id. RLS returns only
 * the caller's own rows, so this is naturally scoped to them. Missing id = not read, not dismissed.
 */
export async function loadNotificationState(eventIds: string[]): Promise<Map<string, EventState>> {
  const map = new Map<string, EventState>();
  if (eventIds.length === 0) return map;
  try {
    const rows = await withAuthedDb((tx) =>
      tx
        .select({
          eventId: notificationState.timelineEventId,
          readAt: notificationState.readAt,
          dismissedAt: notificationState.dismissedAt,
        })
        .from(notificationState)
        .where(inArray(notificationState.timelineEventId, eventIds)),
    );
    for (const r of rows) map.set(r.eventId, { read: Boolean(r.readAt), dismissed: Boolean(r.dismissedAt) });
  } catch {
    /* a state-load hiccup just means everything shows as unread — never block the feed */
  }
  return map;
}
