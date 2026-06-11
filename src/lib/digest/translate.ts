import 'server-only';

/**
 * Daily Digest translation — Claude (Bedrock) renders an existing digest's narrative into a
 * member's preferred language. One model call per language per day: the result is cached in the
 * digest row's `translations` jsonb, so the second Tagalog reader (or the email job) gets it free.
 *
 * Split into a pure model step and a short cache write so callers NEVER hold a DB connection
 * open across the multi-second model call (same discipline as generate.ts):
 *   1. `translateNarrative(digest, lang)`  — model only, no DB.
 *   2. `cacheDigestTranslation(db, …)`     — one short UPDATE, best-effort.
 *
 * Caching note: the UPDATE is denied to read-only members by the daily_digest RLS manage policy.
 * That's fine — a read-only viewer still gets their translation back; it just isn't cached until
 * a writer (or the nightly cron, which runs privileged) asks next.
 */
import { eq } from 'drizzle-orm';
import { dailyDigest } from '@/db/schema';
import { serverLog } from '@/lib/log';
import { askClaude } from '@/lib/ask/bedrock';
import { languageFor, ENGLISH_CODE } from './languages';
import type { Tx } from '@/db/rls';

export interface DigestNarrativeTranslation {
  headline: string;
  paragraphs: string[];
}

/** The slice of a digest row translation needs. */
export interface TranslatableDigest {
  id: string;
  headline: string;
  paragraphs: string[];
}

/** An executor that can UPDATE daily_digest (the RLS Tx or the privileged platform db). */
type UpdatableDb = Pick<Tx, 'update'>;

function parseModelJson(raw: string): { headline?: unknown; paragraphs?: unknown } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Pick a valid cached translation out of a row's `translations` jsonb, if present. */
export function cachedTranslation(
  translations: Record<string, DigestNarrativeTranslation> | null | undefined,
  lang: string,
): DigestNarrativeTranslation | null {
  const t = translations?.[lang];
  if (t && typeof t.headline === 'string' && Array.isArray(t.paragraphs) && t.paragraphs.length > 0) return t;
  return null;
}

/**
 * Translate a digest's narrative into `lang` with Claude. Pure model step — no DB. Returns null
 * for English (the original IS English) and on any model failure: callers fall back to the
 * original text, never an error state, because the digest itself is already on screen.
 */
export async function translateNarrative(
  digest: TranslatableDigest,
  lang: string,
): Promise<DigestNarrativeTranslation | null> {
  if (lang === ENGLISH_CODE) return null;
  const language = languageFor(lang);
  if (!language) return null;

  try {
    const raw = await askClaude({
      system: [
        `You translate Kintwadi's Daily Digest — a warm end-of-day family caregiving update — into ${language.label}.`,
        'Translate faithfully but naturally: keep the warm, plain, family tone; never add, drop, or change facts, names, numbers, medication names, or times.',
        'Respond with ONLY a JSON object: {"headline": string, "paragraphs": string[]} with exactly the same number of paragraphs as the input.',
      ].join(' '),
      user: JSON.stringify({ headline: digest.headline, paragraphs: digest.paragraphs }),
      maxTokens: 900,
    });
    const parsed = parseModelJson(raw);
    const paragraphs = Array.isArray(parsed?.paragraphs)
      ? (parsed.paragraphs as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [];
    if (typeof parsed?.headline !== 'string' || !parsed.headline.trim() || paragraphs.length === 0) {
      serverLog('digest', 'translate', 'failure', { lang, reason: 'bad_model_output' });
      return null;
    }
    serverLog('digest', 'translate', 'success', { lang, digest: digest.id });
    return { headline: parsed.headline.trim(), paragraphs };
  } catch (err) {
    serverLog('digest', 'translate', 'failure', { lang, reason: (err as Error)?.name ?? 'error' });
    return null;
  }
}

/**
 * Merge one translation into the digest row's cache. Best-effort: failures are logged, never
 * thrown (a read-only member's RLS-denied write must not break their view).
 */
export async function cacheDigestTranslation(
  db: UpdatableDb,
  digestId: string,
  existing: Record<string, DigestNarrativeTranslation> | null | undefined,
  lang: string,
  translation: DigestNarrativeTranslation,
): Promise<void> {
  try {
    await db
      .update(dailyDigest)
      .set({ translations: { ...(existing ?? {}), [lang]: translation }, updatedAt: new Date() })
      .where(eq(dailyDigest.id, digestId));
  } catch (err) {
    serverLog('digest', 'translateCache', 'failure', { lang, reason: (err as Error)?.name ?? 'error' });
  }
}
