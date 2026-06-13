'use server';

/**
 * Incidents server actions — report, acknowledge, comment, resolve.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Each action re-checks `requireSession()` and re-authorizes against the user's REAL membership
 *    role in the active circle. RLS (drizzle/0033) is the final backstop.
 *  - All writes run through `withAuthedDb()` (RLS-scoped) and are audited; reporting also emits an
 *    `incident` timeline event (urgent for high severity) so the feed + dashboard surface it.
 *  - Free-text description/comment/notes arrive as FormData (Next's dev logger never prints
 *    FormData contents); logs carry ids/counts, never content.
 */
import { z } from 'zod';
import { after } from 'next/server';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { uploadFile } from '@/lib/storage/s3';
import {
  incident as incidentTable,
  incidentNotification,
  incidentComment,
  membership,
  users,
  careRecipientProfile,
  timelineEvent,
} from '@/db/schema';
import { canReportIncidents, canResolveIncidents } from './access';
import { getIncidentReportContext } from './queries';
import { escalateHighSeverityIncident, type EscalationContact } from './notify';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import type { IncidentReportContext } from '@/components/incidents/types';

export type ActionError = { ok: false; error: string };
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | ActionError;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';
const NO_CIRCLE = 'No active care circle.';

interface ActorContext {
  userId: string;
  name: string | null | undefined;
  circleId: string;
  membershipId: string;
  role: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
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
  if (!m) return null;
  return { userId: user.id, name: user.name, circleId, membershipId: m.id, role: m.role };
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Someone';
}

/**
 * Client-callable wrapper around the server-only report-context reader, so the report flow (a
 * client component) can load the notify list + emergency contact when it opens.
 */
export async function fetchReportContext(): Promise<IncidentReportContext | null> {
  return getIncidentReportContext();
}

const TYPE_LABEL: Record<string, string> = {
  fall: 'a fall',
  hospitalization: 'a hospitalization',
  emergency: 'an emergency',
  other: 'an incident',
};

function readPayload(formData: FormData): unknown {
  const raw = formData.get('payload');
  if (!raw) return {};
  try {
    return JSON.parse(raw.toString());
  } catch {
    return {};
  }
}

const reportSchema = z.object({
  type: z.enum(['fall', 'hospitalization', 'emergency', 'other']),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string().trim().min(3, 'Please describe what happened').max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notify: z.array(z.string().uuid()).max(50).optional().default([]),
});

/** Report an incident: persists it, notifies the chosen members, emits a timeline event. */
export async function reportIncident(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActorContext();
  serverLog('incidents', 'reportIncident', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (!canReportIncidents(ctx.role)) {
    serverLog('incidents', 'reportIncident', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const parsed = reportSchema.safeParse(readPayload(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the report.' };
  const p = parsed.data;

  // When the incident happened (the reporter may backdate it); fall back to now if malformed.
  const occurredAt =
    p.date && p.time && !Number.isNaN(new Date(`${p.date}T${p.time}`).getTime())
      ? new Date(`${p.date}T${p.time}`)
      : new Date();

  // Best-effort photo upload (outside the txn): a failed/absent photo never blocks the report.
  let photoS3Key: string | null = null;
  const photo = formData.get('photo');
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadFile({ circleId: ctx.circleId, category: 'incidents', file: photo, maxBytes: 8 * 1024 * 1024 });
    photoS3Key = uploaded?.key ?? null;
  }

  try {
    const result = await withAuthedDb(async (tx) => {
      const [created] = await tx
        .insert(incidentTable)
        .values({
          circleId: ctx.circleId,
          type: p.type,
          severity: p.severity,
          description: p.description,
          occurredAt,
          status: 'open',
          photoS3Key,
          reportedByMembershipId: ctx.membershipId,
        })
        .returning({ id: incidentTable.id });

      // Notify the chosen members — only those who are real, active members of THIS circle. We pull
      // their email here too (for the high-severity escalation fan-out after this txn commits).
      const requested = [...new Set(p.notify)];
      let contacts: EscalationContact[] = [];
      if (requested.length > 0) {
        const valid = await tx
          .select({ id: membership.id, email: users.email, name: users.name, phone: membership.phone })
          .from(membership)
          .leftJoin(users, eq(users.id, membership.userId))
          .where(
            and(
              inArray(membership.id, requested),
              eq(membership.circleId, ctx.circleId),
              eq(membership.status, 'active'),
              isNull(membership.deletedAt),
            ),
          );
        if (valid.length > 0) {
          await tx.insert(incidentNotification).values(
            valid.map((m) => ({ circleId: ctx.circleId, incidentId: created.id, membershipId: m.id, status: 'pending' as const })),
          );
          // Carry each notified member's email + phone for the high-severity fan-out (email + SMS).
          contacts = valid.map((v) => ({ email: v.email ?? null, phone: v.phone ?? null, name: v.name ?? null }));
        }
      }

      // Surface it on the timeline (urgent for high severity) and link the event back to the incident.
      const [event] = await tx
        .insert(timelineEvent)
        .values({
          circleId: ctx.circleId,
          actorMembershipId: ctx.membershipId,
          eventType: 'incident',
          summary: `${firstName(ctx.name)} reported ${TYPE_LABEL[p.type] ?? 'an incident'}`,
          refType: 'incident',
          refId: created.id,
          isUrgent: p.severity === 'high',
          visibility: 'all',
        })
        .returning({ id: timelineEvent.id });
      await tx.update(incidentTable).set({ timelineEventId: event.id }).where(eq(incidentTable.id, created.id));

      const [recip] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, ctx.circleId))
        .limit(1);

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'incident', entityId: created.id, summary: `Reported ${TYPE_LABEL[p.type] ?? 'an incident'} (${p.severity})` },
        tx,
      );
      return {
        id: created.id,
        contacts,
        recipientFirstName: recip?.fullName?.trim().split(/\s+/)[0] ?? null,
      };
    });

    // High-severity → urgent escalation across SNS + email (best-effort; never throws, runs AFTER
    // the commit so an alerting hiccup can't roll back the saved incident).
    if (p.severity === 'high') {
      await escalateHighSeverityIncident({
        incidentId: result.id,
        circleId: ctx.circleId,
        type: p.type,
        severity: p.severity,
        description: p.description,
        reporterName: firstName(ctx.name),
        recipientFirstName: result.recipientFirstName,
        occurredAt,
        contacts: result.contacts,
      });
    }

    // Per-member Email/Push for the whole circle per their notification prefs (high → urgent, which
    // bypasses quiet hours). This complements the escalation above (which targets the reporter's
    // explicitly-chosen responders via SMS/SNS) so every member who wants incident alerts gets one.
    after(() =>
      dispatchNotification({
        circleId: ctx.circleId,
        type: 'incidents',
        urgent: p.severity === 'high',
        title: p.severity === 'high' ? 'Urgent: incident reported' : 'Incident reported',
        body: `${firstName(ctx.name)} reported ${TYPE_LABEL[p.type] ?? 'an incident'}${result.recipientFirstName ? ` for ${result.recipientFirstName}` : ''} (${p.severity} severity).`,
        path: `/incidents/${result.id}`,
        excludeUserId: ctx.userId,
      }),
    );

    serverLog('incidents', 'reportIncident', 'success', {
      actor: ctx.userId,
      id: result.id,
      severity: p.severity,
      notified: p.notify.length,
      photo: Boolean(photoS3Key),
      escalated: p.severity === 'high',
    });
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    serverLog('incidents', 'reportIncident', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Acknowledge an incident (the current user's own notification row). */
export async function acknowledgeIncident(incidentId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('incidents', 'acknowledgeIncident', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  const id = z.string().uuid().safeParse(incidentId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(incidentNotification)
        .set({ status: 'acknowledged', acknowledgedAt: new Date() })
        .where(
          and(
            eq(incidentNotification.incidentId, id.data),
            eq(incidentNotification.membershipId, ctx.membershipId),
            eq(incidentNotification.circleId, ctx.circleId),
          ),
        )
        .returning({ id: incidentNotification.id });
      // No row → the user wasn't on the notify list; nothing to acknowledge (not an error).
      if (row) {
        await recordAuditEvent(
          ctx.userId,
          { circleId: ctx.circleId, action: 'update', entityType: 'incident', entityId: id.data, summary: 'Acknowledged an incident' },
          tx,
        );
      }
    });
    serverLog('incidents', 'acknowledgeIncident', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('incidents', 'acknowledgeIncident', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

const commentSchema = z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(1000) });

/** Add a coordinating comment to an incident. */
export async function addIncidentComment(formData: FormData): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('incidents', 'addIncidentComment', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (!canReportIncidents(ctx.role)) return { ok: false, error: FORBIDDEN };

  const parsed = commentSchema.safeParse({ id: formData.get('id')?.toString(), body: formData.get('body')?.toString() });
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      // Ensure the incident is in the active circle (RLS also enforces this).
      const [inc] = await tx
        .select({ id: incidentTable.id })
        .from(incidentTable)
        .where(and(eq(incidentTable.id, parsed.data.id), eq(incidentTable.circleId, ctx.circleId), isNull(incidentTable.deletedAt)))
        .limit(1);
      if (!inc) throw new Error('not_found_or_forbidden');

      await tx.insert(incidentComment).values({
        circleId: ctx.circleId,
        incidentId: parsed.data.id,
        authorMembershipId: ctx.membershipId,
        body: parsed.data.body,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'incident', entityId: parsed.data.id, summary: 'Commented on an incident' },
        tx,
      );
    });
    serverLog('incidents', 'addIncidentComment', 'success', { actor: ctx.userId, id: parsed.data.id });
    return { ok: true };
  } catch (err) {
    serverLog('incidents', 'addIncidentComment', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

const resolveSchema = z.object({ id: z.string().uuid(), note: z.string().trim().max(2000).optional().default('') });

/** Mark an incident resolved (coordinators + family only), with an optional note. */
export async function resolveIncident(formData: FormData): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('incidents', 'resolveIncident', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: NO_CIRCLE };
  if (!canResolveIncidents(ctx.role)) {
    serverLog('incidents', 'resolveIncident', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const parsed = resolveSchema.safeParse({ id: formData.get('id')?.toString(), note: formData.get('note')?.toString() });
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(incidentTable)
        .set({
          status: 'resolved',
          resolutionNote: parsed.data.note || null,
          resolvedAt: new Date(),
          resolvedByMembershipId: ctx.membershipId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(incidentTable.id, parsed.data.id),
            eq(incidentTable.circleId, ctx.circleId),
            isNull(incidentTable.deletedAt),
          ),
        )
        .returning({ id: incidentTable.id });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'incident', entityId: parsed.data.id, summary: 'Resolved an incident' },
        tx,
      );
    });
    serverLog('incidents', 'resolveIncident', 'success', { actor: ctx.userId, id: parsed.data.id });
    return { ok: true };
  } catch (err) {
    serverLog('incidents', 'resolveIncident', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
