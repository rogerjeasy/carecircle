'use server';

/**
 * Per-member notification preferences — the type×channel matrix + quiet hours shown in
 * Settings → Notifications. Stored on the caller's own `membership` row (jsonb), so each member
 * keeps their own choices per circle.
 *
 * Security (see AGENTS.md): re-checks `requireSession()`; writes only the caller's OWN membership row
 * (RLS scopes to their circles, the membership id pins it to them) and audits the change.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { recordAuditEvent } from '@/db/audit';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { membership } from '@/db/schema';
import { withDefaults, type NotificationPrefs } from './prefs';

// Canonical prefs types live in ./prefs (pure, no 'use server'); re-exported for existing importers.
export type { NotificationPrefs, QuietHours } from './prefs';

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

export type LoadPrefsResult = { ok: true; prefs: NotificationPrefs } | { ok: false; error: string };

/** Load the caller's notification preferences (falling back to sensible defaults). */
export async function loadNotificationSettings(): Promise<LoadPrefsResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  try {
    const [row] = await withAuthedDb((tx) =>
      tx.select({ prefs: membership.notificationPrefs }).from(membership).where(eq(membership.id, ctx.membershipId)).limit(1),
    );
    // Merge over defaults so a newly-added type/channel always has a value.
    return { ok: true, prefs: withDefaults(row?.prefs) };
  } catch (err) {
    serverLog('notifications', 'loadSettings', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

const prefsSchema = z.object({
  matrix: z.record(z.string(), z.record(z.string(), z.boolean())),
  quiet: z.object({
    enabled: z.boolean(),
    from: z.string().regex(/^\d{2}:\d{2}$/),
    to: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

/** Save the caller's notification preferences (their own membership row). */
export async function saveNotificationSettings(input: NotificationPrefs): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      await tx
        .update(membership)
        .set({ notificationPrefs: parsed.data as NotificationPrefs, updatedAt: new Date() })
        .where(eq(membership.id, ctx.membershipId));
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'membership', entityId: ctx.membershipId, summary: 'Updated notification preferences' },
        tx,
      );
    });
    serverLog('notifications', 'saveSettings', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('notifications', 'saveSettings', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
