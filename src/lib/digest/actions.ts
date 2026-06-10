'use server';

/**
 * Daily Digest server actions — load a saved digest, generate/re-generate one, and record feedback.
 *
 * Security (see AGENTS.md — fail-closed): each action re-checks `requireSession()` and the user's
 * REAL role in the active circle. Generating is gated to non-read-only members (mirrors RLS) and is
 * audited (it reads the day's record). Feedback is private to the rater.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, dbErrorCode } from '@/lib/log';
import { membership, digestFeedback, dailyDigest } from '@/db/schema';
import { canGenerateDigest } from './access';
import { getDigestByDate, getMyFeedback } from './queries';
import { generateDigestForDate } from './generate';
import {
  translateNarrative,
  cacheDigestTranslation,
  cachedTranslation,
  type DigestNarrativeTranslation,
} from './translate';
import { isSupportedLanguage } from './languages';
import { isBedrockConfigured } from '@/lib/ask/bedrock';
import type { Digest, Feedback } from '@/components/digest/types';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export type LoadDigestResult =
  | { ok: true; digest: Digest | null; feedback: Feedback; canGenerate: boolean }
  | { ok: false; error: string };

/** Load the saved digest for a day (+ the caller's feedback). */
export async function loadDigest(dateStr: string): Promise<LoadDigestResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!DATE_RE.test(dateStr)) return { ok: false, error: GENERIC_ERROR };
  try {
    const digest = await getDigestByDate(ctx.circleId, dateStr);
    const feedback = digest ? await getMyFeedback(digest.id) : null;
    serverLog('digest', 'loadDigest', 'success', { actor: ctx.userId, date: dateStr, found: Boolean(digest) });
    return { ok: true, digest, feedback, canGenerate: canGenerateDigest(ctx.role) };
  } catch (err) {
    serverLog('digest', 'loadDigest', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type GenerateDigestResult = { ok: true; digest: Digest } | { ok: false; error: string };

/** Generate (or re-generate) and save the digest for a day. */
export async function generateDigest(dateStr: string): Promise<GenerateDigestResult> {
  const ctx = await getActorContext();
  serverLog('digest', 'generateDigest', 'start', { actor: ctx?.userId, date: dateStr });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canGenerateDigest(ctx.role)) return { ok: false, error: FORBIDDEN };
  if (!DATE_RE.test(dateStr)) return { ok: false, error: GENERIC_ERROR };
  if (!isBedrockConfigured()) {
    serverLog('digest', 'generateDigest', 'failure', { actor: ctx.userId, reason: 'bedrock_unconfigured' });
    return { ok: false, error: 'Digests aren’t available yet — Bedrock is not configured.' };
  }
  try {
    const digest = await generateDigestForDate(
      { userId: ctx.userId, circleId: ctx.circleId, membershipId: ctx.membershipId },
      dateStr,
    );
    return { ok: true, digest };
  } catch (err) {
    serverLog('digest', 'generateDigest', 'failure', { actor: ctx.userId, reason: dbErrorCode(err) ?? (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type TranslateDigestResult =
  | { ok: true; translation: DigestNarrativeTranslation }
  | { ok: false; error: string };

/**
 * Translate a digest's narrative into the caller's language (the diaspora feature). RLS-scoped:
 * the digest row is read inside the member's transaction, so they can only translate digests of
 * circles they belong to. Cached on the row — one model call per language per day.
 */
export async function translateDigest(digestId: string, lang: string): Promise<TranslateDigestResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const id = z.string().uuid().safeParse(digestId);
  if (!id.success || !isSupportedLanguage(lang) || lang === 'en') return { ok: false, error: GENERIC_ERROR };
  if (!isBedrockConfigured()) {
    return { ok: false, error: 'Translations aren’t available yet — Bedrock is not configured.' };
  }

  try {
    // Read the row (RLS-scoped). The model call happens OUTSIDE a transaction; the best-effort
    // cache write opens its own short transaction inside translateDigestNarrative.
    const [row] = await withAuthedDb((tx) =>
      tx
        .select({
          id: dailyDigest.id,
          headline: dailyDigest.headline,
          paragraphs: dailyDigest.paragraphs,
          translations: dailyDigest.translations,
        })
        .from(dailyDigest)
        .where(and(eq(dailyDigest.id, id.data), eq(dailyDigest.circleId, ctx.circleId)))
        .limit(1),
    );
    if (!row) return { ok: false, error: GENERIC_ERROR };

    const cached = cachedTranslation(row.translations, lang);
    if (cached) {
      serverLog('digest', 'translateDigest', 'success', { actor: ctx.userId, lang, cached: true });
      return { ok: true, translation: cached };
    }

    // Model call OUTSIDE any transaction; then a short best-effort cache write.
    const translation = await translateNarrative(
      {
        id: row.id,
        headline: row.headline,
        paragraphs: Array.isArray(row.paragraphs) ? (row.paragraphs as string[]) : [],
      },
      lang,
    );
    if (!translation) return { ok: false, error: 'Couldn’t translate this digest right now.' };
    await withAuthedDb((tx) => cacheDigestTranslation(tx, row.id, row.translations, lang, translation));
    serverLog('digest', 'translateDigest', 'success', { actor: ctx.userId, lang, cached: false });
    return { ok: true, translation };
  } catch (err) {
    serverLog('digest', 'translateDigest', 'failure', { actor: ctx.userId, lang, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

/** Record (or clear) the caller's feedback on a digest. */
export async function rateDigest(digestId: string, value: Exclude<Feedback, null> | null): Promise<SimpleResult> {
  const ctx = await getActorContext();
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  const id = z.string().uuid().safeParse(digestId);
  const val = z.enum(['up', 'down']).nullable().safeParse(value);
  if (!id.success || !val.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      if (val.data === null) {
        await tx
          .delete(digestFeedback)
          .where(and(eq(digestFeedback.digestId, id.data), eq(digestFeedback.userId, ctx.userId)));
        return;
      }
      await tx
        .insert(digestFeedback)
        .values({ digestId: id.data, circleId: ctx.circleId, userId: ctx.userId, value: val.data })
        .onConflictDoUpdate({
          target: [digestFeedback.digestId, digestFeedback.userId],
          set: { value: val.data, updatedAt: new Date() },
        });
    });
    serverLog('digest', 'rateDigest', 'success', { actor: ctx.userId, value: val.data ?? 'cleared' });
    return { ok: true };
  } catch (err) {
    serverLog('digest', 'rateDigest', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
