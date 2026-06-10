'use server';

/**
 * Daily Digest auto-send settings — read + update the circle's nightly-digest configuration and the
 * caller's own per-member opt-in. Backs the "Daily digest" card in Settings → Notifications.
 *
 * Security (see AGENTS.md — fail-closed): every action re-checks `requireSession()` and the user's
 * REAL role in the active circle. Circle-wide config (enable / send hour) is limited to coordinators
 * (owner / family_admin); a member always controls their OWN delivery opt-in. Every change is
 * audited as an `update`, and both the operational + durable trails are written.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { recordAuditEvent } from '@/db/audit';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { careCircle, membership } from '@/db/schema';
import { isSupportedLanguage, languageFor, ENGLISH_CODE } from './languages';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';

/** Coordinators (owner / family_admin) may change circle-wide digest config. */
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

export interface DigestSettings {
  enabled: boolean;
  hour: number;
  /** Whether the caller may change the circle-wide config (vs. just their own opt-in). */
  canManage: boolean;
  /** The caller's own delivery opt-in. */
  myOptIn: boolean;
  /** The caller's digest language ('en' default — see digest/languages.ts). */
  myLanguage: string;
}

export type LoadSettingsResult = { ok: true; settings: DigestSettings } | { ok: false; error: string };

/** Load the circle's digest config + the caller's own opt-in. */
export async function loadDigestSettings(): Promise<LoadSettingsResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  try {
    const settings = await withAuthedDb(async (tx) => {
      const [circle] = await tx
        .select({ enabled: careCircle.digestEnabled, hour: careCircle.digestHour })
        .from(careCircle)
        .where(eq(careCircle.id, ctx.circleId))
        .limit(1);
      const [me] = await tx
        .select({ notifyDigest: membership.notifyDigest, preferredLanguage: membership.preferredLanguage })
        .from(membership)
        .where(eq(membership.id, ctx.membershipId))
        .limit(1);
      return {
        enabled: circle?.enabled ?? true,
        hour: circle?.hour ?? 20,
        canManage: MANAGE_ROLES.has(ctx.role),
        myOptIn: me?.notifyDigest ?? true,
        myLanguage: me?.preferredLanguage ?? ENGLISH_CODE,
      };
    });
    serverLog('digest', 'loadSettings', 'success', { actor: ctx.userId });
    return { ok: true, settings };
  } catch (err) {
    serverLog('digest', 'loadSettings', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

const configSchema = z.object({
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
});

/** Update the circle-wide digest config (coordinators only). */
export async function updateDigestSettings(input: { enabled: boolean; hour: number }): Promise<SimpleResult> {
  const ctx = await getActorContext();
  serverLog('digest', 'updateSettings', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!MANAGE_ROLES.has(ctx.role)) {
    serverLog('digest', 'updateSettings', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }
  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      await tx
        .update(careCircle)
        .set({ digestEnabled: parsed.data.enabled, digestHour: parsed.data.hour })
        .where(eq(careCircle.id, ctx.circleId));
      await recordAuditEvent(
        ctx.userId,
        {
          circleId: ctx.circleId,
          action: 'update',
          entityType: 'circle',
          entityId: ctx.circleId,
          summary: `Set nightly digest ${parsed.data.enabled ? `on at ${String(parsed.data.hour).padStart(2, '0')}:00` : 'off'}`,
        },
        tx,
      );
    });
    serverLog('digest', 'updateSettings', 'success', { actor: ctx.userId, enabled: parsed.data.enabled, hour: parsed.data.hour });
    return { ok: true };
  } catch (err) {
    serverLog('digest', 'updateSettings', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Set the caller's OWN digest language (the diaspora feature — see digest/languages.ts). */
export async function setMyDigestLanguage(lang: string): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!isSupportedLanguage(lang)) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      // RLS already scopes to the caller's circles; pinning the membership id keeps this to MY row.
      await tx
        .update(membership)
        .set({ preferredLanguage: lang === ENGLISH_CODE ? null : lang })
        .where(eq(membership.id, ctx.membershipId));
      await recordAuditEvent(
        ctx.userId,
        {
          circleId: ctx.circleId,
          action: 'update',
          entityType: 'membership',
          entityId: ctx.membershipId,
          summary: `Set their digest language to ${languageFor(lang)?.label ?? lang}`,
        },
        tx,
      );
    });
    serverLog('digest', 'setLanguage', 'success', { actor: ctx.userId, lang });
    return { ok: true };
  } catch (err) {
    serverLog('digest', 'setLanguage', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Toggle the caller's OWN nightly-digest delivery opt-in. */
export async function setMyDigestOptIn(value: boolean): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const parsed = z.boolean().safeParse(value);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      // RLS already scopes to the caller's circles; pinning the membership id keeps this to MY row.
      await tx.update(membership).set({ notifyDigest: parsed.data }).where(eq(membership.id, ctx.membershipId));
      await recordAuditEvent(
        ctx.userId,
        {
          circleId: ctx.circleId,
          action: 'update',
          entityType: 'membership',
          entityId: ctx.membershipId,
          summary: `${parsed.data ? 'Subscribed to' : 'Unsubscribed from'} the nightly digest`,
        },
        tx,
      );
    });
    serverLog('digest', 'setOptIn', 'success', { actor: ctx.userId, value: parsed.data });
    return { ok: true };
  } catch (err) {
    serverLog('digest', 'setOptIn', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
