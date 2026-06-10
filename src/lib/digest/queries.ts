import 'server-only';

/**
 * Read layer for the Daily Digest — saved digests + the caller's feedback.
 *
 * Security (see AGENTS.md): RLS-scoped via `withAuthedDb()`. The digest is shared across the circle
 * (any member may read it); feedback rows are private to the rater (RLS enforces both).
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getSessionUserId, withAuthedDb } from '@/db/dal';
import { dailyDigest, digestFeedback, membership } from '@/db/schema';
import { serverLog, dbErrorCode } from '@/lib/log';
import { ENGLISH_CODE } from './languages';
import type { Digest, DigestStat, Feedback, MoodKey, SourceMoment } from '@/components/digest/types';

/** Map a stored row to the UI Digest shape. */
export function rowToDigest(row: {
  id: string;
  digestDate: string;
  headline: string;
  emoji: string;
  mood: string;
  paragraphs: unknown;
  stats: unknown;
  sources: unknown;
}): Digest {
  return {
    id: row.id,
    date: row.digestDate,
    headline: row.headline,
    emoji: row.emoji,
    mood: row.mood as MoodKey,
    paragraphs: Array.isArray(row.paragraphs) ? (row.paragraphs as string[]) : [],
    stats: Array.isArray(row.stats) ? (row.stats as DigestStat[]) : [],
    sources: Array.isArray(row.sources) ? (row.sources as SourceMoment[]) : [],
  };
}

/** The saved digest for one circle + day, or null. Resilient: returns null on any read error. */
export async function getDigestByDate(circleId: string, dateStr: string): Promise<Digest | null> {
  try {
    const [row] = await withAuthedDb((tx) =>
      tx
        .select({
          id: dailyDigest.id,
          digestDate: dailyDigest.digestDate,
          headline: dailyDigest.headline,
          emoji: dailyDigest.emoji,
          mood: dailyDigest.mood,
          paragraphs: dailyDigest.paragraphs,
          stats: dailyDigest.stats,
          sources: dailyDigest.sources,
        })
        .from(dailyDigest)
        .where(and(eq(dailyDigest.circleId, circleId), eq(dailyDigest.digestDate, dateStr)))
        .limit(1),
    );
    return row ? rowToDigest(row) : null;
  } catch (err) {
    // 42P01 = undefined_table: the digest migration (0029/0030) hasn't been run yet — treat as
    // "no digest" quietly instead of a scary overlay. Log any other failure with its pg code.
    const code = dbErrorCode(err);
    if (code !== '42P01') serverLog('digest', 'getDigestByDate', 'failure', { reason: code ?? (err as Error)?.name ?? 'error' });
    return null;
  }
}

/** The signed-in user's feedback on a digest (or null). */
export async function getMyFeedback(digestId: string): Promise<Feedback> {
  try {
    const [row] = await withAuthedDb((tx) =>
      tx
        .select({ value: digestFeedback.value })
        .from(digestFeedback)
        .where(eq(digestFeedback.digestId, digestId))
        .limit(1),
    );
    return row ? (row.value as Exclude<Feedback, null>) : null;
  } catch (err) {
    const code = dbErrorCode(err);
    if (code !== '42P01') serverLog('digest', 'getMyFeedback', 'failure', { reason: code ?? (err as Error)?.name ?? 'error' });
    return null;
  }
}

/**
 * The signed-in member's digest language in this circle ('en' when unset). Filtered by userId —
 * the membership RLS policy also exposes co-members of the circle, who must not be mistaken
 * for the caller.
 */
export async function getMyDigestLanguage(circleId: string): Promise<string> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return ENGLISH_CODE;
    const [row] = await withAuthedDb((tx) =>
      tx
        .select({ preferredLanguage: membership.preferredLanguage })
        .from(membership)
        .where(
          and(
            eq(membership.circleId, circleId),
            eq(membership.userId, userId),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
          ),
        )
        .limit(1),
    );
    return row?.preferredLanguage ?? ENGLISH_CODE;
  } catch (err) {
    serverLog('digest', 'getMyDigestLanguage', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return ENGLISH_CODE;
  }
}

/** Recent dates (yyyy-MM-dd) that already have a saved digest, newest first (for the stepper hints). */
export async function getRecentDigestDates(circleId: string, limit = 30): Promise<string[]> {
  const rows = await withAuthedDb((tx) =>
    tx
      .select({ digestDate: dailyDigest.digestDate })
      .from(dailyDigest)
      .where(eq(dailyDigest.circleId, circleId))
      .orderBy(desc(dailyDigest.digestDate))
      .limit(limit),
  );
  return rows.map((r) => r.digestDate);
}
