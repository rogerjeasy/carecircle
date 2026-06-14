'use server';

/**
 * Global search — the top-bar command palette over THIS circle's record.
 *
 * 🔒 Security (see AGENTS.md): the entire search runs inside ONE `withAuthedDb()` transaction, so
 * every query is filtered by Row-Level Security to exactly what the signed-in user may see — the
 * SAME policies the feature pages use (document sensitivity tiers, `private` timeline events,
 * role-scoped meds/tasks/etc.). Search therefore NEVER re-implements authorization; it inherits it,
 * fail-closed. We additionally pin every query to the ACTIVE circle (RLS permits all of a user's
 * circles), select only display-safe columns, and log lengths/counts only — never the query text
 * (it can contain PII) or row contents. Never uses the RLS-bypassing platform connection.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import {
  membership,
  users,
  careRecipientProfile,
  medication,
  documents,
  tasks,
  appointment,
  timelineEvent,
  incident,
} from '@/db/schema';
import type { SearchResult, SearchResponse } from './types';

const MIN_LEN = 2;
const PER_TYPE = 5;

const ROLE_LABEL: Record<string, string> = {
  owner: 'Coordinator',
  family_admin: 'Family admin',
  family: 'Family',
  caregiver: 'Caregiver',
  read_only: 'Read-only',
  care_recipient: 'Care recipient',
  clinician: 'Clinician',
};

const EVENT_LABEL: Record<string, string> = {
  med: 'Medication',
  vital: 'Vital',
  note: 'Note',
  appointment: 'Appointment',
  incident: 'Incident',
};

/** Escape LIKE/ILIKE metacharacters so user input can't act as a wildcard (default escape is `\`). */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Search the active circle's record. Returns a flat, ranked list the client groups by type. RLS
 * silently drops anything the caller can't see, so absent rows never leak (not even as a count).
 */
export async function globalSearch(rawQuery: string): Promise<SearchResponse> {
  const user = await requireSession();
  const q = (rawQuery ?? '').trim();
  if (q.length < MIN_LEN) return { results: [] };

  const circleId = await getActiveCircleId();
  if (!circleId) return { results: [] };

  const like = `%${escapeLike(q)}%`;

  try {
    const results = await withAuthedDb(async (tx): Promise<SearchResult[]> => {
      const out: SearchResult[] = [];

      // People (members of THIS circle the caller may see — membership RLS).
      const people = await tx
        .select({ id: membership.id, name: users.name, role: membership.role })
        .from(membership)
        .innerJoin(users, eq(users.id, membership.userId))
        .where(
          and(
            eq(membership.circleId, circleId),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
            sql`${users.name} ilike ${like}`,
          ),
        )
        .orderBy(sql`similarity(coalesce(${users.name}, ''), ${q}) desc`)
        .limit(PER_TYPE);
      for (const p of people) {
        out.push({ id: p.id, type: 'person', title: p.name ?? 'Member', subtitle: ROLE_LABEL[p.role] ?? p.role, href: '/people' });
      }

      // Care recipient profile.
      const recip = await tx
        .select({ id: careRecipientProfile.id, fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(and(eq(careRecipientProfile.circleId, circleId), sql`${careRecipientProfile.fullName} ilike ${like}`))
        .limit(1);
      for (const r of recip) {
        out.push({ id: r.id, type: 'recipient', title: r.fullName, subtitle: 'Care recipient', href: '/profile' });
      }

      // Medications (role-scoped via RLS).
      const meds = await tx
        .select({ id: medication.id, name: medication.name, strength: medication.strength })
        .from(medication)
        .where(
          and(
            eq(medication.circleId, circleId),
            isNull(medication.deletedAt),
            sql`${medication.name} ilike ${like}`,
          ),
        )
        .orderBy(sql`similarity(${medication.name}, ${q}) desc`)
        .limit(PER_TYPE);
      for (const m of meds) {
        out.push({ id: m.id, type: 'medication', title: m.name, subtitle: m.strength ?? undefined, href: '/medications' });
      }

      // Documents (sensitivity tiers enforced by document_select RLS).
      const docs = await tx
        .select({ id: documents.id, title: documents.title, category: documents.category })
        .from(documents)
        .where(and(eq(documents.circleId, circleId), isNull(documents.deletedAt), sql`${documents.title} ilike ${like}`))
        .orderBy(sql`similarity(${documents.title}, ${q}) desc`)
        .limit(PER_TYPE);
      for (const d of docs) {
        out.push({ id: d.id, type: 'document', title: d.title, subtitle: d.category, href: '/documents' });
      }

      // Tasks.
      const taskRows = await tx
        .select({ id: tasks.id, title: tasks.title, status: tasks.status })
        .from(tasks)
        .where(and(eq(tasks.circleId, circleId), isNull(tasks.deletedAt), sql`${tasks.title} ilike ${like}`))
        .orderBy(sql`similarity(${tasks.title}, ${q}) desc`)
        .limit(PER_TYPE);
      for (const t of taskRows) {
        out.push({ id: t.id, type: 'task', title: t.title, subtitle: t.status, href: '/tasks' });
      }

      // Appointments.
      const appts = await tx
        .select({ id: appointment.id, title: appointment.title, startsAt: appointment.startsAt })
        .from(appointment)
        .where(and(eq(appointment.circleId, circleId), isNull(appointment.deletedAt), sql`${appointment.title} ilike ${like}`))
        .orderBy(sql`similarity(${appointment.title}, ${q}) desc`)
        .limit(PER_TYPE);
      for (const a of appts) {
        out.push({
          id: a.id,
          type: 'appointment',
          title: a.title,
          subtitle: a.startsAt ? a.startsAt.toLocaleDateString() : undefined,
          href: '/appointments',
        });
      }

      // Timeline notes/events (visibility tiers enforced by timeline_event RLS — hides `private`).
      const events = await tx
        .select({ id: timelineEvent.id, summary: timelineEvent.summary, eventType: timelineEvent.eventType })
        .from(timelineEvent)
        .where(and(eq(timelineEvent.circleId, circleId), sql`${timelineEvent.summary} ilike ${like}`))
        .orderBy(sql`similarity(${timelineEvent.summary}, ${q}) desc`)
        .limit(PER_TYPE);
      for (const e of events) {
        out.push({ id: e.id, type: 'timeline', title: e.summary, subtitle: EVENT_LABEL[e.eventType] ?? 'Timeline', href: '/timeline' });
      }

      // Incidents.
      const incidents = await tx
        .select({ id: incident.id, description: incident.description, type: incident.type, severity: incident.severity })
        .from(incident)
        .where(and(eq(incident.circleId, circleId), isNull(incident.deletedAt), sql`${incident.description} ilike ${like}`))
        .orderBy(sql`similarity(${incident.description}, ${q}) desc`)
        .limit(PER_TYPE);
      for (const i of incidents) {
        out.push({
          id: i.id,
          type: 'incident',
          title: i.description,
          subtitle: `${i.type} · ${i.severity}`,
          href: `/incidents/${i.id}`,
        });
      }

      return out;
    });

    serverLog('search', 'globalSearch', 'success', { actor: user.id, len: q.length, results: results.length });
    return { results };
  } catch (err) {
    serverLog('search', 'globalSearch', 'failure', { actor: user.id, len: q.length, reason: (err as Error)?.name ?? 'error' });
    return { results: [] };
  }
}
