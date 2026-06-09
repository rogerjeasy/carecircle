import 'server-only';

/**
 * Daily Digest generation — gather the day's REAL events for a circle, compute accurate stats +
 * source moments deterministically, then have Claude (Bedrock) write the warm narrative grounded in
 * that data. The digest is persisted (one row per circle per day) so everyone sees the same thing
 * and re-opening is instant.
 *
 * Two entry points share one core (gather → ask Claude → persist):
 *   - `generateDigestForDate(ctx, …)` — interactive, run inside the signed-in member's RLS context.
 *   - `generateDigestForCircleSystem(db, …)` — the nightly cron path, run with NO user session via
 *     the privileged cross-tenant connection (see src/lib/digest/cron.ts). It audits as the system
 *     (no actor user/membership).
 *
 * To allow both, the DB-touching steps take a `DigestDb` executor (an RLS-scoped `Tx` OR the
 * privileged platform `db`) rather than calling `withAuthedDb()` themselves — same pattern as the
 * RAG layer's `DbLike`. Gather and persist are SEPARATE short transactions so we never hold a DB
 * connection open across the multi-second model call.
 *
 * Security (see AGENTS.md): the interactive path stays RLS-scoped; the system path uses the
 * privileged connection that the cron route guards with `CRON_SECRET`. Generating reads the day's
 * record (sensitive) and writes the digest → it is audited as a `create`.
 */
import { and, asc, desc, eq, gte, inArray, isNull, lt } from 'drizzle-orm';
import { addDays, format, parseISO } from 'date-fns';
import { withAuthedDb } from '@/db/dal';
import type { Tx } from '@/db/rls';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import {
  careRecipientProfile,
  medication,
  medicationAdministration,
  observation,
  timelineEvent,
  tasks as taskTable,
  appointment,
  dailyDigest,
  auditLog,
} from '@/db/schema';
import { askClaude } from '@/lib/ask/bedrock';
import type { Digest, DigestStat, MoodKey, SourceMoment } from '@/components/digest/types';

/**
 * A database executor the digest steps can run against: either the signed-in member's RLS-scoped
 * transaction (`Tx`) or the privileged cross-tenant `db` used by the cron. Both expose the same
 * query builders, so the structural subset is all we need (mirrors RAG's `DbLike`).
 */
export type DigestDb = Pick<Tx, 'select' | 'insert'>;

interface GenContext {
  userId: string;
  circleId: string;
  membershipId: string;
}

/** Who triggered a generation, for audit. The system (cron) path leaves both null. */
interface GenActor {
  userId: string | null;
  membershipId: string | null;
}

const MOOD: Record<MoodKey, { label: string; emoji: string }> = {
  great: { label: 'Great', emoji: '😄' },
  good: { label: 'Good', emoji: '🙂' },
  okay: { label: 'Okay', emoji: '😐' },
  low: { label: 'Low', emoji: '😕' },
};
const MOOD_KEYS: MoodKey[] = ['great', 'good', 'okay', 'low'];

const METRIC_LABEL: Record<string, string> = {
  bp: 'Blood pressure',
  glucose: 'Glucose',
  weight: 'Weight',
  sleep: 'Sleep',
  mood: 'Mood',
  hr: 'Resting heart rate',
};

function fmtMetric(metric: string, value: number, secondary: number | null): string {
  switch (metric) {
    case 'bp':
      return `${Math.round(value)}/${Math.round(secondary ?? 0)}`;
    case 'sleep':
      return `${value}h`;
    case 'hr':
      return `${Math.round(value)} bpm`;
    case 'glucose':
      return `${Math.round(value)} mg/dL`;
    case 'weight':
      return `${value} kg`;
    default:
      return String(value);
  }
}

function moodFromValue(v: number): MoodKey {
  if (v >= 4.5) return 'great';
  if (v >= 3.5) return 'good';
  if (v >= 2.5) return 'okay';
  return 'low';
}

function fmtTime(d: Date): string {
  return format(d, 'h:mm a');
}

interface Gathered {
  recipientName: string | null;
  contextText: string;
  coreStats: DigestStat[];
  sources: SourceMoment[];
  derivedMood: MoodKey;
}

/** Pull a day's events for the circle and shape them into context + accurate stats + sources. */
async function gatherDay(db: DigestDb, circleId: string, dateStr: string): Promise<Gathered> {
  const start = parseISO(`${dateStr}T00:00:00`);
  const end = addDays(start, 1);

  const [recipient] = await db
    .select({ fullName: careRecipientProfile.fullName })
    .from(careRecipientProfile)
    .where(eq(careRecipientProfile.circleId, circleId))
    .limit(1);

  const meds = await db
    .select({ name: medication.name, administeredAt: medicationAdministration.administeredAt })
    .from(medicationAdministration)
    .innerJoin(medication, eq(medication.id, medicationAdministration.medicationId))
    .where(
      and(
        eq(medicationAdministration.circleId, circleId),
        inArray(medicationAdministration.status, ['given', 'taken']),
        gte(medicationAdministration.administeredAt, start),
        lt(medicationAdministration.administeredAt, end),
      ),
    )
    .orderBy(asc(medicationAdministration.administeredAt));

  const obs = await db
    .select({
      metric: observation.metric,
      value: observation.value,
      secondary: observation.secondary,
      recordedAt: observation.recordedAt,
    })
    .from(observation)
    .where(
      and(
        eq(observation.circleId, circleId),
        isNull(observation.deletedAt),
        gte(observation.recordedAt, start),
        lt(observation.recordedAt, end),
      ),
    )
    .orderBy(desc(observation.recordedAt));

  const events = await db
    .select({ summary: timelineEvent.summary, eventType: timelineEvent.eventType, occurredAt: timelineEvent.occurredAt })
    .from(timelineEvent)
    .where(
      and(
        eq(timelineEvent.circleId, circleId),
        inArray(timelineEvent.eventType, ['note', 'incident']),
        gte(timelineEvent.occurredAt, start),
        lt(timelineEvent.occurredAt, end),
      ),
    )
    .orderBy(asc(timelineEvent.occurredAt));

  const tasksDone = await db
    .select({ title: taskTable.title, updatedAt: taskTable.updatedAt })
    .from(taskTable)
    .where(
      and(
        eq(taskTable.circleId, circleId),
        eq(taskTable.status, 'done'),
        isNull(taskTable.deletedAt),
        gte(taskTable.updatedAt, start),
        lt(taskTable.updatedAt, end),
      ),
    );

  const appts = await db
    .select({ title: appointment.title, provider: appointment.provider, startsAt: appointment.startsAt, status: appointment.status })
    .from(appointment)
    .where(
      and(
        eq(appointment.circleId, circleId),
        isNull(appointment.deletedAt),
        gte(appointment.startsAt, start),
        lt(appointment.startsAt, end),
      ),
    )
    .orderBy(asc(appointment.startsAt));

  const data = { recipient, meds, obs, events, tasksDone, appts };

  // Latest reading per metric (rows are desc, so first seen wins).
  const latest = new Map<string, { value: number; secondary: number | null; recordedAt: Date }>();
  for (const o of data.obs) if (!latest.has(o.metric)) latest.set(o.metric, o);

  const incidents = data.events.filter((e) => e.eventType === 'incident');

  // ---- Stats (accurate, computed from data) ----
  const core: DigestStat[] = [];
  if (data.meds.length > 0) core.push({ key: 'meds', label: 'Doses given', value: String(data.meds.length) });
  const bp = latest.get('bp');
  if (bp) core.push({ key: 'bp', label: 'Blood pressure', value: fmtMetric('bp', bp.value, bp.secondary) });
  // A third stat: prefer sleep, then another vital, then tasks completed.
  const thirdMetric = (['sleep', 'glucose', 'hr', 'weight'] as const).find((m) => latest.has(m));
  if (thirdMetric) {
    const o = latest.get(thirdMetric)!;
    core.push({ key: thirdMetric, label: METRIC_LABEL[thirdMetric], value: fmtMetric(thirdMetric, o.value, o.secondary) });
  } else if (data.tasksDone.length > 0) {
    core.push({ key: 'tasks', label: 'Tasks done', value: String(data.tasksDone.length) });
  }

  // ---- Derived mood (fallback if the model doesn't return a valid one) ----
  const moodObs = latest.get('mood');
  const derivedMood: MoodKey = incidents.length
    ? 'low'
    : moodObs
      ? moodFromValue(moodObs.value)
      : data.meds.length > 0
        ? 'good'
        : 'okay';

  // ---- Source moments (real events with times) ----
  type Cand = { type: SourceMoment['type']; label: string; date: Date };
  const cands: Cand[] = [];
  for (const m of data.meds) if (m.administeredAt) cands.push({ type: 'med', label: `${m.name} given`, date: m.administeredAt });
  for (const [metric, o] of latest) {
    if (metric === 'mood') continue;
    cands.push({ type: 'vital', label: `${METRIC_LABEL[metric]} ${fmtMetric(metric, o.value, o.secondary)}`, date: o.recordedAt });
  }
  for (const e of data.events) cands.push({ type: 'note', label: e.summary.length > 48 ? `${e.summary.slice(0, 45)}…` : e.summary, date: e.occurredAt });
  for (const a of data.appts) cands.push({ type: 'appointment', label: a.title, date: a.startsAt });
  cands.sort((x, y) => x.date.getTime() - y.date.getTime());
  const sources: SourceMoment[] = cands.slice(0, 6).map((c, i) => ({ id: `src-${i}`, type: c.type, label: c.label, time: fmtTime(c.date) }));

  // ---- Context block for the model ----
  const lines: string[] = [];
  lines.push(
    `Medications given (${data.meds.length}): ${data.meds.map((m) => `${m.name}${m.administeredAt ? ` at ${fmtTime(m.administeredAt)}` : ''}`).join('; ') || 'none recorded'}`,
  );
  lines.push(
    `Vitals: ${[...latest].map(([metric, o]) => `${METRIC_LABEL[metric]} ${fmtMetric(metric, o.value, o.secondary)} at ${fmtTime(o.recordedAt)}`).join('; ') || 'none recorded'}`,
  );
  lines.push(`Notes & updates: ${data.events.map((e) => `"${e.summary}" (${fmtTime(e.occurredAt)})`).join('; ') || 'none'}`);
  lines.push(`Tasks completed: ${data.tasksDone.map((t) => t.title).join('; ') || 'none'}`);
  lines.push(
    `Appointments: ${data.appts.map((a) => `${a.title}${a.provider ? ` with ${a.provider}` : ''} at ${fmtTime(a.startsAt)} (${a.status})`).join('; ') || 'none'}`,
  );

  return {
    recipientName: data.recipient?.fullName?.trim().split(/\s+/)[0] ?? null,
    contextText: lines.join('\n'),
    coreStats: core,
    sources,
    derivedMood,
  };
}

function systemPrompt(): string {
  return [
    "You write CareCircle's Daily Digest: a warm, end-of-day update for a family member who couldn't be there.",
    'Use ONLY the events provided — never invent meds, numbers, visits, or names.',
    'Write 2–3 short paragraphs: calm, specific, plain language, reassuring but honest. If little was logged, say so gently.',
    'Choose a mood from exactly: great, good, okay, low. Pick a short warm headline (max 6 words, no name, no trailing period) and ONE emoji.',
    'Respond with ONLY a JSON object: {"headline": string, "emoji": string, "mood": "great"|"good"|"okay"|"low", "paragraphs": string[]}.',
  ].join(' ');
}

function parseModelJson(raw: string): { headline?: string; emoji?: string; mood?: string; paragraphs?: unknown } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** The model-written + computed fields for a digest, before persistence. */
interface Narrative {
  headline: string;
  emoji: string;
  mood: MoodKey;
  paragraphs: string[];
  stats: DigestStat[];
}

/** Ask Claude to write the narrative for a gathered day, with deterministic fallbacks. */
async function composeNarrative(g: Gathered, dateStr: string): Promise<Narrative> {
  const dayLabel = format(parseISO(`${dateStr}T00:00:00`), 'EEEE, MMMM d');
  const who = g.recipientName ?? 'the care recipient';

  const raw = await askClaude({
    system: systemPrompt(),
    user: `Recipient: ${who}\nDate: ${dayLabel}\n\n${g.contextText}`,
    maxTokens: 700,
  });

  const parsed = parseModelJson(raw);
  const mood: MoodKey = MOOD_KEYS.includes(parsed?.mood as MoodKey) ? (parsed!.mood as MoodKey) : g.derivedMood;
  const headline = (typeof parsed?.headline === 'string' && parsed.headline.trim()) || `A ${MOOD[mood].label.toLowerCase()} day`;
  const emoji = (typeof parsed?.emoji === 'string' && parsed.emoji.trim()) || MOOD[mood].emoji;
  const paragraphs =
    Array.isArray(parsed?.paragraphs) && parsed!.paragraphs.length
      ? (parsed!.paragraphs as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      : [`Here's a brief summary of ${who}'s day. ${g.contextText.split('\n')[0]}.`];

  // The mood stat reflects the FINAL mood; keep it last so it always shows.
  const stats: DigestStat[] = [
    ...g.coreStats.slice(0, 3),
    { key: 'mood', label: 'Mood', value: MOOD[mood].label, emoji: MOOD[mood].emoji },
  ];

  return { headline, emoji, mood, paragraphs, stats };
}

/**
 * Upsert the digest row (one per circle per day) and audit it as a `create`. Runs against whatever
 * executor it's given (interactive RLS tx or the privileged cron db). Audit is best-effort within
 * the same write so a logging hiccup never loses the digest.
 */
async function persistDigest(
  db: DigestDb,
  circleId: string,
  dateStr: string,
  narrative: Narrative,
  sources: SourceMoment[],
  actor: GenActor,
): Promise<string> {
  const { headline, emoji, mood, paragraphs, stats } = narrative;
  const model = process.env.BEDROCK_MODEL_ID ?? 'bedrock';

  const [inserted] = await db
    .insert(dailyDigest)
    .values({
      circleId,
      digestDate: dateStr,
      headline,
      emoji,
      mood,
      paragraphs,
      stats,
      sources,
      model,
      generatedByMembershipId: actor.membershipId,
    })
    .onConflictDoUpdate({
      target: [dailyDigest.circleId, dailyDigest.digestDate],
      set: { headline, emoji, mood, paragraphs, stats, sources, model, generatedByMembershipId: actor.membershipId, updatedAt: new Date() },
    })
    .returning({ id: dailyDigest.id });

  // Audit the generation. A signed-in member is recorded via the blessed primitive (same tx); the
  // system/cron path has no actor user, so we write the row directly with a null actor.
  if (actor.userId) {
    await recordAuditEvent(
      actor.userId,
      { circleId, action: 'create', entityType: 'digest', entityId: inserted.id, summary: `Generated the daily digest for ${dateStr}` },
      db as Tx,
    );
  } else {
    try {
      await db.insert(auditLog).values({
        circleId,
        actorUserId: null,
        action: 'create',
        entityType: 'digest',
        entityId: inserted.id,
        summary: `Auto-generated the daily digest for ${dateStr}`,
      });
    } catch (err) {
      console.error('[audit] failed to record system digest event:', (err as Error)?.name ?? 'error');
    }
  }

  return inserted.id;
}

/** Assemble the saved Digest shape returned to callers. */
function toDigest(id: string, dateStr: string, n: Narrative, sources: SourceMoment[]): Digest {
  return { id, date: dateStr, headline: n.headline, emoji: n.emoji, mood: n.mood, paragraphs: n.paragraphs, stats: n.stats, sources };
}

/**
 * Generate (or re-generate) and persist the digest for one day, as the signed-in member.
 * Gather and persist run as two short RLS transactions either side of the model call.
 */
export async function generateDigestForDate(ctx: GenContext, dateStr: string): Promise<Digest> {
  const g = await withAuthedDb((tx) => gatherDay(tx, ctx.circleId, dateStr));
  const narrative = await composeNarrative(g, dateStr);
  const id = await withAuthedDb((tx) =>
    persistDigest(tx, ctx.circleId, dateStr, narrative, g.sources, { userId: ctx.userId, membershipId: ctx.membershipId }),
  );
  serverLog('digest', 'generate', 'success', { actor: ctx.userId, date: dateStr, sources: g.sources.length });
  return toDigest(id, dateStr, narrative, g.sources);
}

/**
 * Generate + persist the digest for one circle/day on the SYSTEM (cron) path — no user session.
 * The caller supplies the privileged cross-tenant `db` (RLS-bypassing) and is responsible for
 * gating access (the cron route checks `CRON_SECRET`). Audited with a null actor.
 */
export async function generateDigestForCircleSystem(db: DigestDb, circleId: string, dateStr: string): Promise<Digest> {
  const g = await gatherDay(db, circleId, dateStr);
  const narrative = await composeNarrative(g, dateStr);
  const id = await persistDigest(db, circleId, dateStr, narrative, g.sources, { userId: null, membershipId: null });
  serverLog('digest', 'generateSystem', 'success', { actor: 'system', circle: circleId, date: dateStr, sources: g.sources.length });
  return toDigest(id, dateStr, narrative, g.sources);
}
