import 'server-only';

/**
 * Daily care scans — the proactive sweeps the architecture diagram promises alongside the digest:
 *
 *  1. REFILL  — any active medication at/below its refill threshold gets an open `refill` task
 *               (skipped while one is already open, so the sweep is idempotent and self-healing).
 *  2. MISSED  — yesterday's scheduled dose occurrences with no record are written as `missed`
 *               administrations (the reconciliation job the dose enum reserved the status for);
 *               new misses post ONE urgent timeline event for the circle.
 *  3. DECLINE — a vital that has been out of its safe range (Health → Alerts) for 3 consecutive
 *               days posts an urgent timeline event + a best-effort SNS escalation.
 *
 * Triggered by src/app/api/cron/scans/route.ts (Vercel Cron, `CRON_SECRET`-gated). Every sweep is
 * idempotent, so re-fires within a day are safe: refill checks for an open task, missed-dose
 * inserts ride the (schedule_id, scheduled_for) unique constraint, and decline dedupes against a
 * recent `decline` timeline event.
 *
 * 🔒 Security (see AGENTS.md): a privileged, cross-tenant background job with NO user session —
 * it must read/write every circle, so it uses the RLS-bypassing platform connection
 * (`getPlatformDb()`), exactly like the digest cron. Access is gated upstream by `CRON_SECRET`.
 * Each system write is audited with a null actor (the system), like the digest generator.
 */
import { and, eq, gte, isNull, ne, sql } from 'drizzle-orm';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { getPlatformDb } from '@/db/admin-db';
import {
  auditLog,
  careCircle,
  healthAlertSetting,
  medication,
  medicationAdministration,
  medicationSchedule,
  observation,
  tasks,
  timelineEvent,
} from '@/db/schema';
import { serverLog } from '@/lib/log';
import { sendEscalation } from '@/lib/email';
import { mergeThresholds, rangeLabel } from '@/lib/health/alerts';
import { statusOf } from '@/components/health/utils';
import type { MetricKey, StatusLevel } from '@/components/health/types';

const METRIC_LABEL: Record<MetricKey, string> = {
  bp: 'Blood pressure',
  glucose: 'Glucose',
  weight: 'Weight',
  sleep: 'Sleep',
  mood: 'Mood',
  hr: 'Resting heart rate',
};

/** How many consecutive out-of-range days trigger a decline alert. */
export const DECLINE_STREAK_DAYS = 3;

export interface CareScansResult {
  /** Circles considered this run. */
  scanned: number;
  refillTasksCreated: number;
  missedDosesRecorded: number;
  declineAlertsPosted: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// Timezone helpers (Intl-based; no tz library). DST-edge drift of ±1h is fine
// for a daily sweep — the unique constraint keeps the writes idempotent anyway.
// ---------------------------------------------------------------------------

/** The circle-local calendar date (`yyyy-MM-dd`) for `now` in `timeZone` (UTC fallback). */
function localDateStr(timeZone: string, now: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Milliseconds the zone is ahead of UTC at `utcDate` (e.g. +02:00 → 7_200_000). */
function tzOffsetMs(timeZone: string, utcDate: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asUtc - utcDate.getTime();
}

/** The UTC instant of `dateStr` (`yyyy-MM-dd`) + `timeStr` (`HH:mm`) on the circle's wall clock. */
function zonedToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  try {
    return new Date(naive.getTime() - tzOffsetMs(timeZone, naive));
  } catch {
    return naive;
  }
}

// ---------------------------------------------------------------------------
// Decline streak — pure decision logic (unit-tested in __tests__/scans.test.ts)
// ---------------------------------------------------------------------------

/**
 * Given one status per local calendar day (the day's LATEST reading), return the shared
 * out-of-range direction if the most recent `minDays` dated entries are consecutive calendar
 * days AND all out of range the same way; null otherwise.
 */
export function findDeclineStreak(
  entries: Array<{ date: string; status: StatusLevel }>,
  minDays: number = DECLINE_STREAK_DAYS,
): Exclude<StatusLevel, 'normal'> | null {
  if (entries.length < minDays) return null;
  const recent = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, minDays);
  const direction = recent[0].status;
  if (direction === 'normal') return null;
  for (let i = 0; i < recent.length; i++) {
    if (recent[i].status !== direction) return null;
    if (i > 0 && differenceInCalendarDays(parseISO(recent[i - 1].date), parseISO(recent[i].date)) !== 1) {
      return null;
    }
  }
  return direction;
}

// ---------------------------------------------------------------------------
// The sweeps
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof getPlatformDb>;

/** Best-effort system audit row (null actor, like the digest generator). Never throws. */
async function auditSystem(db: Db, circleId: string, entityType: string, summary: string): Promise<void> {
  try {
    await db.insert(auditLog).values({ circleId, actorUserId: null, action: 'create', entityType, summary });
  } catch (err) {
    console.error('[audit] failed to record system scan event:', (err as Error)?.name ?? 'error');
  }
}

/** Sweep 1 — open a refill task for any active med at/below its threshold (one open task per med). */
async function refillSweep(db: Db, circleId: string): Promise<number> {
  const lowMeds = await db
    .select({
      id: medication.id,
      name: medication.name,
      strength: medication.strength,
      supplyCount: medication.supplyCount,
      refillThreshold: medication.refillThreshold,
    })
    .from(medication)
    .where(
      and(
        eq(medication.circleId, circleId),
        eq(medication.isActive, true),
        isNull(medication.deletedAt),
        isNull(medication.discontinuedAt),
        sql`${medication.supplyCount} <= ${medication.refillThreshold}`,
      ),
    );

  let created = 0;
  for (const med of lowMeds) {
    const title = `Refill ${med.name}`;
    const [open] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.circleId, circleId),
          eq(tasks.category, 'refill'),
          eq(tasks.title, title),
          ne(tasks.status, 'done'),
          isNull(tasks.deletedAt),
        ),
      )
      .limit(1);
    if (open) continue; // already flagged — idempotent

    const label = `${med.name}${med.strength ? ` ${med.strength}` : ''}`;
    const dueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await db.insert(tasks).values({
      circleId,
      title,
      details: `Supply is at ${med.supplyCount} — at or below the refill threshold (${med.refillThreshold}).`,
      category: 'refill',
      status: 'open',
      dueAt,
    });
    await db.insert(timelineEvent).values({
      circleId,
      eventType: 'task',
      summary: `CareCircle flagged ${label} for refill — ${med.supplyCount} left.`,
      refType: 'medication',
      refId: med.id,
    });
    await auditSystem(db, circleId, 'task', `Auto-created a refill task for a low-supply medication`);
    created += 1;
  }
  return created;
}

/** Sweep 2 — write `missed` rows for yesterday's unrecorded scheduled doses; one urgent event if any. */
async function missedDoseSweep(db: Db, circleId: string, timeZone: string, now: Date): Promise<number> {
  // Yesterday on the circle's wall clock.
  const todayLocal = localDateStr(timeZone, now);
  const yesterday = new Date(parseISO(`${todayLocal}T12:00:00`).getTime() - 24 * 60 * 60 * 1000);
  const dateStr = yesterday.toISOString().slice(0, 10);
  const weekday = parseISO(`${dateStr}T12:00:00`).getDay();

  const schedules = await db
    .select({
      scheduleId: medicationSchedule.id,
      medicationId: medicationSchedule.medicationId,
      timeOfDay: medicationSchedule.timeOfDay,
      daysOfWeek: medicationSchedule.daysOfWeek,
    })
    .from(medicationSchedule)
    .innerJoin(medication, eq(medication.id, medicationSchedule.medicationId))
    .where(
      and(
        eq(medicationSchedule.circleId, circleId),
        isNull(medicationSchedule.deletedAt),
        eq(medication.isActive, true),
        eq(medication.isPrn, false),
        isNull(medication.deletedAt),
        isNull(medication.discontinuedAt),
      ),
    );

  let missed = 0;
  for (const s of schedules) {
    if (!s.daysOfWeek.includes(weekday)) continue;
    const scheduledFor = zonedToUtc(dateStr, s.timeOfDay, timeZone);
    // The unique (schedule_id, scheduled_for) occurrence key makes this insert idempotent and
    // a no-op when the dose WAS recorded (given/taken/skipped/refused) for that slot.
    const inserted = await db
      .insert(medicationAdministration)
      .values({
        circleId,
        medicationId: s.medicationId,
        scheduleId: s.scheduleId,
        scheduledFor,
        status: 'missed',
      })
      .onConflictDoNothing({
        target: [medicationAdministration.scheduleId, medicationAdministration.scheduledFor],
      })
      .returning({ id: medicationAdministration.id });
    missed += inserted.length;
  }

  if (missed > 0) {
    await db.insert(timelineEvent).values({
      circleId,
      eventType: 'med',
      summary:
        missed === 1
          ? 'A scheduled dose was missed yesterday — check the medication log.'
          : `${missed} scheduled doses were missed yesterday — check the medication log.`,
      isUrgent: true,
    });
    await auditSystem(db, circleId, 'medication_administration', `Reconciled ${missed} missed dose(s) for ${dateStr}`);
  }
  return missed;
}

/** Sweep 3 — urgent decline alert when a vital is out of range `DECLINE_STREAK_DAYS` days running. */
async function declineSweep(
  db: Db,
  circleId: string,
  timeZone: string,
  now: Date,
): Promise<number> {
  const settingRows = await db
    .select({
      metric: healthAlertSetting.metric,
      enabled: healthAlertSetting.enabled,
      min: healthAlertSetting.min,
      max: healthAlertSetting.max,
      diaMin: healthAlertSetting.diaMin,
      diaMax: healthAlertSetting.diaMax,
    })
    .from(healthAlertSetting)
    .where(and(eq(healthAlertSetting.circleId, circleId), isNull(healthAlertSetting.deletedAt)));
  const thresholds = mergeThresholds(settingRows);

  // Readings from the last 5 days — enough to find a 3-day streak ending today or yesterday.
  const since = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const readings = await db
    .select({
      metric: observation.metric,
      value: observation.value,
      secondary: observation.secondary,
      recordedAt: observation.recordedAt,
    })
    .from(observation)
    .where(and(eq(observation.circleId, circleId), isNull(observation.deletedAt), gte(observation.recordedAt, since)))
    .orderBy(observation.recordedAt);

  // Per metric: the LATEST reading of each circle-local day → one status per day.
  const byMetricDay = new Map<MetricKey, Map<string, StatusLevel>>();
  for (const r of readings) {
    const metric = r.metric as MetricKey;
    if (!thresholds[metric].enabled) continue;
    const day = localDateStr(timeZone, r.recordedAt);
    let days = byMetricDay.get(metric);
    if (!days) byMetricDay.set(metric, (days = new Map()));
    // Readings arrive oldest → newest, so the last write per day is the day's latest reading.
    days.set(day, statusOf(metric, r.value, r.secondary ?? undefined, thresholds[metric]));
  }

  let posted = 0;
  for (const [metric, days] of byMetricDay) {
    const entries = [...days.entries()].map(([date, status]) => ({ date, status }));
    const direction = findDeclineStreak(entries);
    if (!direction) continue;

    // Dedupe: don't re-post while a decline alert for this metric is < 3 days old.
    const [recent] = await db
      .select({ id: timelineEvent.id })
      .from(timelineEvent)
      .where(
        and(
          eq(timelineEvent.circleId, circleId),
          eq(timelineEvent.refType, 'decline'),
          sql`${timelineEvent.payload}->>'metric' = ${metric}`,
          gte(timelineEvent.occurredAt, new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
        ),
      )
      .limit(1);
    if (recent) continue;

    const summary = `${METRIC_LABEL[metric]} has been ${rangeLabel(direction)} for ${DECLINE_STREAK_DAYS} days in a row.`;
    await db.insert(timelineEvent).values({
      circleId,
      eventType: 'vital',
      summary,
      refType: 'decline',
      isUrgent: true,
      payload: { metric, direction },
    });
    await auditSystem(db, circleId, 'observation', `Decline alert: ${metric} ${rangeLabel(direction)} ${DECLINE_STREAK_DAYS} days running`);

    // Best-effort SNS escalation — the urgent timeline event is already the durable alert.
    try {
      await sendEscalation({
        subject: `CareCircle decline alert: ${METRIC_LABEL[metric]}`,
        message: `${summary} Open CareCircle → Health for the trend.`,
        attributes: { kind: 'decline_alert', circleId, metric },
      });
    } catch {
      serverLog('scans', 'declineEscalation', 'failure', { circle: circleId, metric });
    }
    posted += 1;
  }
  return posted;
}

// ---------------------------------------------------------------------------
// The job
// ---------------------------------------------------------------------------

/** Run one pass of the care scans across every circle. Idempotent per circle-local day. */
export async function runCareScans(opts?: { now?: Date }): Promise<CareScansResult> {
  const now = opts?.now ?? new Date();
  const result: CareScansResult = {
    scanned: 0,
    refillTasksCreated: 0,
    missedDosesRecorded: 0,
    declineAlertsPosted: 0,
    errors: 0,
  };

  const db = getPlatformDb();
  const circles = await db
    .select({ id: careCircle.id, primaryTimezone: careCircle.primaryTimezone })
    .from(careCircle);

  result.scanned = circles.length;
  serverLog('scans', 'cron', 'start', { scanned: circles.length });

  for (const c of circles) {
    try {
      result.refillTasksCreated += await refillSweep(db, c.id);
      result.missedDosesRecorded += await missedDoseSweep(db, c.id, c.primaryTimezone, now);
      result.declineAlertsPosted += await declineSweep(db, c.id, c.primaryTimezone, now);
    } catch (err) {
      result.errors += 1;
      serverLog('scans', 'cron', 'failure', { circle: c.id, reason: (err as Error)?.name ?? 'error' });
    }
  }

  serverLog('scans', 'cron', 'success', {
    scanned: result.scanned,
    refill: result.refillTasksCreated,
    missed: result.missedDosesRecorded,
    decline: result.declineAlertsPosted,
    errors: result.errors,
  });
  return result;
}
