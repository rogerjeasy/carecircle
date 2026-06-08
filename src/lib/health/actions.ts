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
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { observation, membership, timelineEvent } from '@/db/schema';
import { canLogReadings } from './access';
import type { MetricKey, Reading } from '@/components/health/types';

export type LogObservationResult = { ok: true; data: Reading } | { ok: false; error: string };

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
    const row = await withAuthedDb(async (tx) => {
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

      await tx.insert(timelineEvent).values({
        circleId,
        actorMembershipId: me.id,
        eventType: 'vital',
        summary: `${firstName(user.name)} logged ${METRIC_LABEL[p.metric]}: ${formatReading(p.metric, p.value, p.secondary)}`,
        refType: 'observation',
        refId: created.id,
      });
      await recordAuditEvent(
        user.id,
        { circleId, action: 'create', entityType: 'observation', entityId: created.id, summary: `Logged a ${p.metric} reading` },
        tx,
      );
      return created;
    });

    serverLog('health', 'logObservation', 'success', { actor: user.id, id: row.id, metric: p.metric });
    return {
      ok: true,
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
