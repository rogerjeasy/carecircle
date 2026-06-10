import 'server-only';

/**
 * Nightly Daily Digest auto-send — the scheduled job that writes each circle's digest for itself
 * and emails it to opted-in family.
 *
 * Triggered hourly by the cron route (src/app/api/cron/digest/route.ts, guarded by `CRON_SECRET`).
 * Each run scans every circle with `digestEnabled = true`; for a circle it acts only when the
 * circle-LOCAL clock (its `primaryTimezone`) has reached `digestHour` and we haven't already sent
 * for that local calendar day. `lastDigestSentDate` is the idempotency guard against double-sends
 * (the route may fire more than once an hour, and several hours fall after `digestHour`).
 *
 * 🔒 Security (see AGENTS.md): this is a privileged, cross-tenant background job with NO user
 * session — it must read/write EVERY circle, so it uses the RLS-bypassing platform connection
 * (`getPlatformDb()`), exactly like the `/api/ingest` backfill. Access is gated upstream by the
 * route's `CRON_SECRET`. Each generation is audited (system actor) inside `generate.ts`; each email
 * send logs its own success/failure with a masked address.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { format, parseISO } from 'date-fns';
import { getPlatformDb } from '@/db/admin-db';
import { careCircle, careRecipientProfile, membership, users } from '@/db/schema';
import { serverLog } from '@/lib/log';
import { getAppOrigin } from '@/lib/url';
import { sendDigestEmail } from '@/lib/email';
import { generateDigestForCircleSystem } from './generate';
import { translateNarrative, cacheDigestTranslation, type DigestNarrativeTranslation } from './translate';
import { ENGLISH_CODE } from './languages';

export interface DigestCronResult {
  /** Circles with auto-send enabled that we considered this run. */
  scanned: number;
  /** Circles whose digest we generated + marked sent this run. */
  generated: number;
  /** Individual digest emails delivered. */
  emailed: number;
  /** Circles skipped because it's not their send hour yet, or already sent today. */
  skipped: number;
  /** Circles that errored during generation, plus per-recipient send failures. */
  errors: number;
}

/**
 * The circle-local calendar date (`yyyy-MM-dd`) and hour (0–23) for `now` in `timeZone`.
 * Falls back to UTC for an unknown/invalid timezone so the job still runs deterministically.
 */
function circleLocalParts(timeZone: string, now: Date): { date: string; hour: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    let hour = Number(get('hour'));
    if (hour === 24) hour = 0; // some engines emit "24" for midnight
    return { date: `${get('year')}-${get('month')}-${get('day')}`, hour };
  } catch {
    const iso = now.toISOString();
    return { date: iso.slice(0, 10), hour: now.getUTCHours() };
  }
}

/**
 * Run one pass of the nightly digest job.
 *
 * @param opts.now    Override "now" (for testing / manual triggers). Defaults to the current time.
 * @param opts.force  Ignore the send-hour + already-sent guards (manual "send now"). Still records
 *                    `lastDigestSentDate` so the regular schedule won't re-send afterwards.
 */
export async function runDigestCron(opts?: { now?: Date; force?: boolean }): Promise<DigestCronResult> {
  const now = opts?.now ?? new Date();
  const force = opts?.force ?? false;
  const result: DigestCronResult = { scanned: 0, generated: 0, emailed: 0, skipped: 0, errors: 0 };

  const db = getPlatformDb();
  const origin = await getAppOrigin();
  const digestUrl = `${origin}/digest`;

  const circles = await db
    .select({
      id: careCircle.id,
      primaryTimezone: careCircle.primaryTimezone,
      digestHour: careCircle.digestHour,
      lastDigestSentDate: careCircle.lastDigestSentDate,
      recipientFullName: careRecipientProfile.fullName,
    })
    .from(careCircle)
    .leftJoin(careRecipientProfile, eq(careRecipientProfile.circleId, careCircle.id))
    .where(eq(careCircle.digestEnabled, true));

  result.scanned = circles.length;
  serverLog('digest', 'cron', 'start', { scanned: circles.length, force });

  for (const c of circles) {
    const { date: localDate, hour } = circleLocalParts(c.primaryTimezone, now);

    if (!force) {
      // Not yet the circle's send hour, or we already sent for this local day → nothing to do.
      if (hour < c.digestHour || c.lastDigestSentDate === localDate) {
        result.skipped += 1;
        continue;
      }
    }

    const recipientName = c.recipientFullName?.trim().split(/\s+/)[0] || 'Your loved one';

    try {
      const digest = await generateDigestForCircleSystem(db, c.id, localDate);

      // Mark sent immediately so a re-fire this hour (or a partial email failure below) can't
      // trigger a second generate/send for the same local day.
      await db.update(careCircle).set({ lastDigestSentDate: localDate }).where(eq(careCircle.id, c.id));
      result.generated += 1;

      // Opted-in, active members with an email address (and their digest language).
      const recipients = await db
        .select({ email: users.email, name: users.name, preferredLanguage: membership.preferredLanguage })
        .from(membership)
        .innerJoin(users, eq(users.id, membership.userId))
        .where(
          and(
            eq(membership.circleId, c.id),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
            eq(membership.notifyDigest, true),
          ),
        );

      // The diaspora moment: translate the narrative ONCE per language used in this circle, cache
      // it on the digest row, and send each member the day in their own tongue. Best-effort — a
      // failed translation falls back to the English original, never blocks the send.
      const languages = [...new Set(recipients.map((r) => r.preferredLanguage).filter((l): l is string => Boolean(l) && l !== ENGLISH_CODE))];
      const byLanguage = new Map<string, DigestNarrativeTranslation>();
      let cachedTranslations: Record<string, DigestNarrativeTranslation> = {};
      for (const lang of languages) {
        const t = await translateNarrative({ id: digest.id, headline: digest.headline, paragraphs: digest.paragraphs }, lang);
        if (t) {
          byLanguage.set(lang, t);
          cachedTranslations = { ...cachedTranslations, [lang]: t };
          await cacheDigestTranslation(db, digest.id, cachedTranslations, lang, t);
        }
      }

      const dayLabel = format(parseISO(`${localDate}T00:00:00`), 'EEEE, MMMM d');
      for (const r of recipients) {
        const t = r.preferredLanguage ? byLanguage.get(r.preferredLanguage) : undefined;
        const localized = t ? { ...digest, headline: t.headline, paragraphs: t.paragraphs } : digest;
        try {
          await sendDigestEmail({ to: r.email, digest: localized, recipientName, dayLabel, digestUrl });
          result.emailed += 1;
        } catch {
          // `deliver()` already logged the failure with a masked address; one bad send must not
          // stop the rest of the circle (or the run).
          result.errors += 1;
        }
      }
    } catch (err) {
      result.errors += 1;
      serverLog('digest', 'cron', 'failure', { circle: c.id, reason: (err as Error)?.name ?? 'error' });
    }
  }

  serverLog('digest', 'cron', 'success', {
    scanned: result.scanned,
    generated: result.generated,
    emailed: result.emailed,
    skipped: result.skipped,
    errors: result.errors,
  });
  return result;
}
