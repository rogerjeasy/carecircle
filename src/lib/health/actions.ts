'use server';

/**
 * Health server action — log a vital reading.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Re-checks `requireSession()` and re-authorizes against the user's REAL membership role in the
 *    active circle. RLS (drizzle/0021) is the final backstop.
 *  - Writes through `withAuthedDb()` (RLS-scoped), audited, and posts a timeline "vital" event.
 *  - The reading's note is free text, so the action takes FormData (Next's dev logger never prints
 *    FormData contents); logs carry the metric + ids only, never the value/note.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { after } from 'next/server';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { observation, membership, timelineEvent, healthAlertSetting, careRecipientProfile } from '@/db/schema';
import { canLogReadings, canManageAlertSettings } from './access';
import { evaluateReading, loadThresholds, notifyOutOfRange, rangeLabel, THRESHOLD_METRICS } from './alerts';
import type { MetricKey, Reading, StatusLevel, ThresholdMap } from '@/components/health/types';

export type LogObservationResult =
  | { ok: true; data: Reading; status: StatusLevel }
  | { ok: false; error: string };

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';

const METRICS = ['bp', 'glucose', 'weight', 'sleep', 'mood', 'hr'] as const;
const METRIC_LABEL: Record<MetricKey, string> = {
  bp: 'Blood pressure',
  glucose: 'Glucose',
  weight: 'Weight',
  sleep: 'Sleep',
  mood: 'Mood',
  hr: 'Resting HR',
};
const MOOD_LABEL = ['', 'Very low', 'Low', 'Okay', 'Good', 'Great'];
const UNIT: Partial<Record<MetricKey, string>> = { glucose: 'mg/dL', weight: 'kg', sleep: 'h', hr: 'bpm' };

function formatReading(metric: MetricKey, value: number, secondary?: number): string {
  if (metric === 'bp') return `${Math.round(value)}/${Math.round(secondary ?? 0)} mmHg`;
  if (metric === 'mood') return MOOD_LABEL[Math.round(value)] ?? String(value);
  const u = UNIT[metric];
  return `${value}${u ? ` ${u}` : ''}`;
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Someone';
}

const schema = z.object({
  metric: z.enum(METRICS),
  value: z.number().finite(),
  secondary: z.number().finite().optional(),
  atISO: z.string().datetime(),
  note: z.string().max(500).optional().default(''),
  recordedBy: z.string().uuid().optional().or(z.literal('')),
});

/** Log a vital reading. Returns the created Reading for instant reconciliation. */
export async function logObservation(formData: FormData): Promise<LogObservationResult> {
  const user = await requireSession();
  serverLog('health', 'logObservation', 'start', { actor: user.id });
  const circleId = await getActiveCircleId();
  if (!circleId) return { ok: false, error: 'No active care circle.' };

  const [me] = await withAuthedDb((tx) =>
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
  if (!me) return { ok: false, error: 'No active care circle.' };
  if (!canLogReadings(me.role)) {
    serverLog('health', 'logObservation', 'failure', { actor: user.id, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  let raw: unknown = {};
  try {
    raw = JSON.parse(formData.get('payload')?.toString() ?? '{}');
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    serverLog('health', 'logObservation', 'failure', { actor: user.id, reason: 'validation' });
    return { ok: false, error: 'Please check the reading.' };
  }
  const p = parsed.data;
  const recordedAt = new Date(p.atISO);

  try {
    const { row, status, recipientName, summary } = await withAuthedDb(async (tx) => {
      // Resolve the chosen recorder to a membership in this circle, else attribute to the actor.
      let recordedById = me.id;
      if (p.recordedBy) {
        const [chosen] = await tx
          .select({ id: membership.id })
          .from(membership)
          .where(and(eq(membership.id, p.recordedBy), eq(membership.circleId, circleId), isNull(membership.deletedAt)))
          .limit(1);
        if (chosen) recordedById = chosen.id;
      }

      const [created] = await tx
        .insert(observation)
        .values({
          circleId,
          metric: p.metric,
          value: p.value,
          secondary: p.metric === 'bp' ? p.secondary ?? null : null,
          recordedAt,
          note: p.note || null,
          recordedByMembershipId: recordedById,
        })
        .returning();

      // Evaluate against the circle's safe ranges (drizzle/0038 RLS) — an out-of-range reading
      // posts as URGENT so it tops the notifications feed for the whole circle.
      const thresholds = await loadThresholds(tx, circleId);
      const status = evaluateReading(p.metric, p.value, p.secondary, thresholds);
      const reading = formatReading(p.metric, p.value, p.secondary);
      const summary =
        status === 'normal'
          ? `${firstName(user.name)} logged ${METRIC_LABEL[p.metric]}: ${reading}`
          : `${firstName(user.name)} logged ${METRIC_LABEL[p.metric]}: ${reading} — ${rangeLabel(status)}`;

      await tx.insert(timelineEvent).values({
        circleId,
        actorMembershipId: me.id,
        eventType: 'vital',
        summary,
        refType: 'observation',
        refId: created.id,
        isUrgent: status !== 'normal',
      });
      await recordAuditEvent(
        user.id,
        {
          circleId,
          action: 'create',
          entityType: 'observation',
          entityId: created.id,
          summary: status === 'normal' ? `Logged a ${p.metric} reading` : `Logged a ${p.metric} reading (out of range)`,
        },
        tx,
      );

      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1);

      return { row: created, status, recipientName: recipient?.fullName?.trim().split(/\s+/)[0] ?? null, summary };
    });

    // Best-effort urgent fan-out AFTER the commit — the reading + urgent event are already durable.
    if (status !== 'normal') {
      await notifyOutOfRange({
        circleId,
        metricLabel: METRIC_LABEL[p.metric],
        formattedValue: formatReading(p.metric, p.value, p.secondary),
        status,
        recipientName,
      });
    }

    // Per-member Email/Push per their notification prefs (urgent when the reading is out of range).
    after(() =>
      dispatchNotification({
        circleId,
        type: 'vitals',
        urgent: status !== 'normal',
        title: status === 'normal' ? `${METRIC_LABEL[p.metric]} logged` : `${METRIC_LABEL[p.metric]} ${rangeLabel(status)}`,
        body: summary,
        path: '/health',
        excludeUserId: user.id,
      }),
    );

    serverLog('health', 'logObservation', 'success', { actor: user.id, id: row.id, metric: p.metric, status });
    return {
      ok: true,
      status,
      data: {
        id: row.id,
        metric: p.metric,
        at: recordedAt,
        value: p.value,
        secondary: p.metric === 'bp' ? p.secondary : undefined,
        note: p.note || undefined,
        recordedBy: row.recordedByMembershipId ?? '',
      },
    };
  } catch (err) {
    serverLog('health', 'logObservation', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ============================================================================
// Alert thresholds — Health → Alerts "Save changes"
// ============================================================================

export type SaveAlertThresholdsResult = { ok: true } | { ok: false; error: string };

const thresholdSchema = z
  .object({
    enabled: z.boolean(),
    min: z.number().finite(),
    max: z.number().finite(),
    diaMin: z.number().finite().optional(),
    diaMax: z.number().finite().optional(),
  })
  .refine((t) => !t.enabled || t.min < t.max, { message: 'min must be below max' });

const thresholdMapSchema = z.object({
  bp: thresholdSchema,
  glucose: thresholdSchema,
  weight: thresholdSchema,
  sleep: thresholdSchema,
  mood: thresholdSchema,
  hr: thresholdSchema,
});

/**
 * Persist the circle's alert safe ranges (one row per metric, upserted). Coordinators + family
 * only — re-checked here against the caller's REAL role and enforced again by RLS (drizzle/0038).
 */
export async function saveAlertThresholds(formData: FormData): Promise<SaveAlertThresholdsResult> {
  const user = await requireSession();
  serverLog('health', 'saveAlertThresholds', 'start', { actor: user.id });
  const circleId = await getActiveCircleId();
  if (!circleId) return { ok: false, error: 'No active care circle.' };

  const [me] = await withAuthedDb((tx) =>
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
  if (!me) return { ok: false, error: 'No active care circle.' };
  if (!canManageAlertSettings(me.role)) {
    serverLog('health', 'saveAlertThresholds', 'failure', { actor: user.id, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  let raw: unknown = {};
  try {
    raw = JSON.parse(formData.get('payload')?.toString() ?? '{}');
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed = thresholdMapSchema.safeParse(raw);
  if (!parsed.success) {
    serverLog('health', 'saveAlertThresholds', 'failure', { actor: user.id, reason: 'validation' });
    return { ok: false, error: 'Please check the ranges — each minimum must be below its maximum.' };
  }
  const map = parsed.data as ThresholdMap;

  try {
    await withAuthedDb(async (tx) => {
      for (const metric of THRESHOLD_METRICS) {
        const t = map[metric];
        const values = {
          circleId,
          metric,
          enabled: t.enabled,
          min: t.min,
          max: t.max,
          diaMin: metric === 'bp' ? t.diaMin ?? null : null,
          diaMax: metric === 'bp' ? t.diaMax ?? null : null,
          updatedByMembershipId: me.id,
        };
        await tx
          .insert(healthAlertSetting)
          .values(values)
          .onConflictDoUpdate({
            target: [healthAlertSetting.circleId, healthAlertSetting.metric],
            set: {
              enabled: values.enabled,
              min: values.min,
              max: values.max,
              diaMin: values.diaMin,
              diaMax: values.diaMax,
              updatedByMembershipId: me.id,
              updatedAt: new Date(),
            },
          });
      }
      await recordAuditEvent(
        user.id,
        { circleId, action: 'update', entityType: 'health_alert_setting', summary: 'Updated health alert safe ranges' },
        tx,
      );
    });
    serverLog('health', 'saveAlertThresholds', 'success', { actor: user.id, circleId });
    return { ok: true };
  } catch (err) {
    serverLog('health', 'saveAlertThresholds', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
