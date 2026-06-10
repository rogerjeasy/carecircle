import 'server-only';

/**
 * Health alert thresholds — server side of the Health → Alerts safe ranges.
 *
 * Persistence: one `health_alert_setting` row per (circle, metric); metrics without a row fall
 * back to DEFAULT_THRESHOLDS (the same constants the client previews with), so a brand-new circle
 * gets sensible ranges without any setup. RLS (drizzle/0038) scopes rows to the caller's circles
 * and limits writes to coordinators + family.
 *
 * Evaluation: `logObservation` calls `loadThresholds` + `evaluateReading` inside its RLS
 * transaction, marks the out-of-range timeline event urgent, and (post-commit, best-effort)
 * fans out an SNS escalation via `notifyOutOfRange` — same posture as the incidents layer:
 * the reading is already saved, so notification failures log but never throw.
 */
import { eq } from 'drizzle-orm';
import type { Tx } from '@/db/rls';
import { healthAlertSetting } from '@/db/schema';
import { sendEscalation } from '@/lib/email';
import { serverLog } from '@/lib/log';
import { DEFAULT_THRESHOLDS } from '@/components/health/data';
import { statusOf } from '@/components/health/utils';
import type { MetricKey, StatusLevel, ThresholdMap, Thresholds } from '@/components/health/types';

export const THRESHOLD_METRICS = ['bp', 'glucose', 'weight', 'sleep', 'mood', 'hr'] as const;

/** A circle's stored rows merged over the defaults — always a complete map. */
export function mergeThresholds(
  rows: Array<{
    metric: string;
    enabled: boolean;
    min: number;
    max: number;
    diaMin: number | null;
    diaMax: number | null;
  }>,
): ThresholdMap {
  const map = Object.fromEntries(
    Object.entries(DEFAULT_THRESHOLDS).map(([k, v]) => [k, { ...v }]),
  ) as ThresholdMap;
  for (const r of rows) {
    const metric = r.metric as MetricKey;
    if (!(metric in map)) continue;
    const t: Thresholds = { enabled: r.enabled, min: r.min, max: r.max };
    if (metric === 'bp') {
      t.diaMin = r.diaMin ?? DEFAULT_THRESHOLDS.bp.diaMin;
      t.diaMax = r.diaMax ?? DEFAULT_THRESHOLDS.bp.diaMax;
    }
    map[metric] = t;
  }
  return map;
}

/** Load the circle's effective thresholds inside an RLS-scoped transaction. */
export async function loadThresholds(tx: Tx, circleId: string): Promise<ThresholdMap> {
  const rows = await tx
    .select({
      metric: healthAlertSetting.metric,
      enabled: healthAlertSetting.enabled,
      min: healthAlertSetting.min,
      max: healthAlertSetting.max,
      diaMin: healthAlertSetting.diaMin,
      diaMax: healthAlertSetting.diaMax,
    })
    .from(healthAlertSetting)
    .where(eq(healthAlertSetting.circleId, circleId));
  return mergeThresholds(rows);
}

/** Evaluate a reading against the circle's thresholds → normal / elevated / low. */
export function evaluateReading(
  metric: MetricKey,
  value: number,
  secondary: number | undefined,
  thresholds: ThresholdMap,
): StatusLevel {
  return statusOf(metric, value, secondary, thresholds[metric]);
}

/** "above the safe range" / "below the safe range" for an out-of-range status. */
export function rangeLabel(status: StatusLevel): string {
  return status === 'elevated' ? 'above the safe range' : 'below the safe range';
}

/**
 * Best-effort urgent fan-out for an out-of-range reading (SNS escalation topic). Runs AFTER the
 * logging transaction committed; never throws into the caller — the reading is already saved and
 * the urgent timeline event is the durable in-app alert.
 */
export async function notifyOutOfRange(params: {
  circleId: string;
  metricLabel: string;
  formattedValue: string;
  status: StatusLevel;
  recipientName: string | null;
}): Promise<void> {
  const { circleId, metricLabel, formattedValue, status, recipientName } = params;
  try {
    const who = recipientName ?? 'the care recipient';
    await sendEscalation({
      subject: `Health alert: ${metricLabel} ${rangeLabel(status)}`,
      message: `${metricLabel} for ${who} was logged at ${formattedValue} — ${rangeLabel(status)} set for the circle. Open CareCircle → Health for the trend.`,
      attributes: { kind: 'health_alert', circleId, status },
    });
    serverLog('health', 'alertEscalation', 'success', { circleId, status });
  } catch (err) {
    // Never let a notification failure surface — the urgent timeline event already exists.
    serverLog('health', 'alertEscalation', 'failure', {
      circleId,
      reason: (err as Error)?.name ?? 'error',
    });
  }
}
