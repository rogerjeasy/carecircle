'use server';

/**
 * Web Push device registration — the signed-in member enables/disables push on THIS browser.
 *
 * The browser creates a PushSubscription (endpoint + keys) and hands it here; we store it on the
 * caller's OWN membership row for the active circle so the dispatcher can reach this device. A
 * member can enable push per circle on the same browser (one row each).
 *
 * Security (see AGENTS.md): re-checks `requireSession()`; all writes go through `withAuthedDb()` so
 * RLS pins them to the caller's own membership; logs ids/counts only — never the endpoint or keys.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { recordAuditEvent } from '@/db/audit';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { membership, pushSubscription } from '@/db/schema';
import { getVapidPublicKey, isPushConfigured } from './config';

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
  return { userId: user.id, circleId, membershipId: m.id };
}

/** The public VAPID key the browser needs to subscribe — or null when push isn't configured. */
export async function getPushPublicKey(): Promise<{ enabled: boolean; key: string | null }> {
  return { enabled: isPushConfigured(), key: getVapidPublicKey() };
}

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(400).optional(),
});

/** Store (or refresh) this browser's push subscription for the active circle. */
export async function savePushSubscription(input: unknown): Promise<SimpleResult> {
  if (!isPushConfigured()) return { ok: false, error: 'Push notifications are not available right now.' };
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      await tx
        .insert(pushSubscription)
        .values({
          circleId: ctx.circleId,
          membershipId: ctx.membershipId,
          endpoint: parsed.data.endpoint,
          p256dh: parsed.data.p256dh,
          auth: parsed.data.auth,
          userAgent: parsed.data.userAgent ?? null,
        })
        .onConflictDoUpdate({
          target: [pushSubscription.membershipId, pushSubscription.endpoint],
          set: {
            circleId: ctx.circleId,
            p256dh: parsed.data.p256dh,
            auth: parsed.data.auth,
            userAgent: parsed.data.userAgent ?? null,
            updatedAt: new Date(),
          },
        });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'membership', entityId: ctx.membershipId, summary: 'Enabled push notifications on a device' },
        tx,
      );
    });
    serverLog('push', 'subscribe', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('push', 'subscribe', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Remove this browser's push subscription for the active circle (member disabled push here). */
export async function removePushSubscription(endpoint: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const ep = z.string().url().max(1000).safeParse(endpoint);
  if (!ep.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb((tx) =>
      tx
        .delete(pushSubscription)
        .where(and(eq(pushSubscription.membershipId, ctx.membershipId), eq(pushSubscription.endpoint, ep.data))),
    );
    serverLog('push', 'unsubscribe', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('push', 'unsubscribe', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
