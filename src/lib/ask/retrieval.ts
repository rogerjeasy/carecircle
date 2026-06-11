import 'server-only';

/**
 * Retrieval for "Ask Kintwadi" — gathers the active circle's real record (recipient, meds,
 * recent vitals, appointments, timeline, open tasks) into a compact, grounded context block plus
 * a parallel list of citeable SourceRefs. The assistant answers ONLY from this context.
 *
 * Security (see AGENTS.md): everything is read through `withAuthedDb()` (RLS-scoped) and pinned to
 * the active circle — the model only ever sees this circle's data.
 */
import { and, asc, desc, eq, gte, isNull } from 'drizzle-orm';
import { format, subDays } from 'date-fns';
import { withAuthedDb } from '@/db/dal';
import {
  careRecipientProfile,
  medication,
  observation,
  appointment,
  timelineEvent,
  tasks as taskTable,
} from '@/db/schema';
import type { SourceRef } from '@/components/ask/types';

/** One retrieved fact: its prompt text + the SourceRef the UI shows. */
interface ContextItem {
  tag: string; // "S1", "S2" … — how the model cites it
  text: string; // line shown to the model
  source: SourceRef;
}

const METRIC_LABEL: Record<string, string> = {
  bp: 'Blood pressure',
  glucose: 'Glucose',
  weight: 'Weight',
  sleep: 'Sleep',
  mood: 'Mood',
  hr: 'Resting heart rate',
};
const METRIC_UNIT: Record<string, string> = { glucose: ' mg/dL', weight: ' kg', sleep: ' h', hr: ' bpm' };

function fmtMetric(metric: string, value: number, secondary: number | null): string {
  if (metric === 'bp') return `${Math.round(value)}/${Math.round(secondary ?? 0)} mmHg`;
  return `${value}${METRIC_UNIT[metric] ?? ''}`;
}

function shortDate(d: Date): string {
  return format(d, 'MMM d');
}

export interface CareContext {
  recipientName: string | null;
  contextText: string;
  sources: SourceRef[];
}

/** Build the grounded context + citeable sources for one circle. */
export async function getCareContext(circleId: string): Promise<CareContext> {
  const now = new Date();
  const monthAgo = subDays(now, 30);

  const data = await withAuthedDb(async (tx) => {
    const [recipient] = await tx
      .select()
      .from(careRecipientProfile)
      .where(eq(careRecipientProfile.circleId, circleId))
      .limit(1);

    const meds = await tx
      .select({ id: medication.id, name: medication.name, strength: medication.strength, purpose: medication.purpose, isActive: medication.isActive, discontinuedAt: medication.discontinuedAt })
      .from(medication)
      .where(and(eq(medication.circleId, circleId), isNull(medication.deletedAt)))
      .orderBy(asc(medication.name));

    const obs = await tx
      .select({ id: observation.id, metric: observation.metric, value: observation.value, secondary: observation.secondary, recordedAt: observation.recordedAt })
      .from(observation)
      .where(and(eq(observation.circleId, circleId), isNull(observation.deletedAt), gte(observation.recordedAt, monthAgo)))
      .orderBy(desc(observation.recordedAt));

    const appts = await tx
      .select({ id: appointment.id, title: appointment.title, provider: appointment.provider, startsAt: appointment.startsAt, status: appointment.status })
      .from(appointment)
      .where(and(eq(appointment.circleId, circleId), isNull(appointment.deletedAt)))
      .orderBy(desc(appointment.startsAt))
      .limit(8);

    const events = await tx
      .select({ id: timelineEvent.id, summary: timelineEvent.summary, occurredAt: timelineEvent.occurredAt })
      .from(timelineEvent)
      .where(eq(timelineEvent.circleId, circleId))
      .orderBy(desc(timelineEvent.occurredAt))
      .limit(12);

    const openTasks = await tx
      .select({ id: taskTable.id, title: taskTable.title, status: taskTable.status, dueAt: taskTable.dueAt })
      .from(taskTable)
      .where(and(eq(taskTable.circleId, circleId), isNull(taskTable.deletedAt)))
      .orderBy(asc(taskTable.sortOrder))
      .limit(20);

    return { recipient, meds, obs, appts, events, openTasks };
  });

  const recipientName = data.recipient?.fullName?.trim().split(/\s+/)[0] ?? null;
  const items: ContextItem[] = [];
  let n = 0;
  const tag = () => `S${++n}`;
  const add = (text: string, source: Omit<SourceRef, 'id'>) => {
    const t = tag();
    items.push({ tag: t, text: `[${t}] ${text}`, source: { id: t, ...source } });
  };

  // Recipient profile (no source card — it's ambient context).
  const profileLines: string[] = [];
  if (data.recipient) {
    const p = data.recipient;
    if (p.bloodType) profileLines.push(`Blood type ${p.bloodType}`);
    const conditions = Array.isArray(p.conditions) ? (p.conditions as string[]) : [];
    const allergies = Array.isArray(p.allergies) ? (p.allergies as string[]) : [];
    if (conditions.length) profileLines.push(`Conditions: ${conditions.join(', ')}`);
    if (allergies.length) profileLines.push(`Allergies: ${allergies.join(', ')}`);
  }

  // Medications (active first).
  for (const m of data.meds) {
    const status = m.discontinuedAt ? 'discontinued' : m.isActive ? 'active' : 'paused';
    const detail = [m.strength, m.purpose].filter(Boolean).join(' · ') || 'Medication';
    add(`Medication: ${m.name}${m.strength ? ` ${m.strength}` : ''} (${m.purpose ?? 'no stated purpose'}) — ${status}`, {
      type: 'med',
      label: `${m.name}${m.strength ? ` ${m.strength}` : ''}`,
      detail,
      time: status,
      href: '/medications',
    });
  }

  // Vitals — latest reading per metric (+ count over 30d).
  const byMetric = new Map<string, { latest: (typeof data.obs)[number]; count: number }>();
  for (const o of data.obs) {
    const cur = byMetric.get(o.metric);
    if (!cur) byMetric.set(o.metric, { latest: o, count: 1 });
    else cur.count += 1; // rows are desc, so the first seen is the latest
  }
  for (const [metric, { latest, count }] of byMetric) {
    const label = METRIC_LABEL[metric] ?? metric;
    const val = fmtMetric(metric, latest.value, latest.secondary);
    add(`${label}: latest ${val} on ${shortDate(latest.recordedAt)} (${count} reading${count === 1 ? '' : 's'} in last 30 days)`, {
      type: 'vital',
      label: `${label} ${val}`,
      detail: `${count} reading${count === 1 ? '' : 's'} this month`,
      time: shortDate(latest.recordedAt),
      href: '/health',
    });
  }

  // Appointments.
  for (const a of data.appts) {
    const when = a.startsAt > now ? 'upcoming' : a.status === 'completed' ? 'completed' : 'past';
    add(`Appointment: ${a.title}${a.provider ? ` with ${a.provider}` : ''} on ${shortDate(a.startsAt)} (${when})`, {
      type: 'appointment',
      label: a.title,
      detail: a.provider ?? when,
      time: shortDate(a.startsAt),
      href: '/appointments',
    });
  }

  // Timeline updates.
  for (const e of data.events) {
    add(`Update on ${shortDate(e.occurredAt)}: ${e.summary}`, {
      type: 'timeline',
      label: e.summary.length > 70 ? `${e.summary.slice(0, 67)}…` : e.summary,
      detail: 'Timeline update',
      time: shortDate(e.occurredAt),
      href: '/timeline',
    });
  }

  // Open tasks (not done).
  for (const t of data.openTasks.filter((t) => t.status !== 'done')) {
    add(`Task (${t.status}): ${t.title}${t.dueAt ? ` — due ${shortDate(t.dueAt)}` : ''}`, {
      type: 'note',
      label: t.title,
      detail: `Task · ${t.status}`,
      time: t.dueAt ? shortDate(t.dueAt) : 'no due date',
      href: '/tasks',
    });
  }

  const sections: string[] = [];
  if (recipientName || profileLines.length) {
    sections.push(`Care recipient: ${data.recipient?.fullName ?? 'Unknown'}${profileLines.length ? `\n${profileLines.join('\n')}` : ''}`);
  }
  if (items.length) {
    sections.push(`Records (cite by tag, e.g. [S1]):\n${items.map((i) => i.text).join('\n')}`);
  }

  return {
    recipientName,
    contextText: sections.join('\n\n') || 'No records are available yet.',
    sources: items.map((i) => i.source),
  };
}
