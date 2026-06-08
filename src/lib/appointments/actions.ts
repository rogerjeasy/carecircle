'use server';

/**
 * Appointments server actions — schedule, edit, and the in-detail patches (assign, prep checklist,
 * notes, visit summary, post-to-timeline, cancel).
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Each action re-checks `requireSession()` and re-authorizes against the user's REAL membership
 *    role in the active circle. RLS (drizzle/0019) is the final backstop.
 *  - All writes run through `withAuthedDb()` (RLS-scoped) and are audited.
 *  - Title/notes/summary are free text, so create/edit/patch ride in FormData (Next's dev logger
 *    never prints FormData contents); logs carry ids/counts only.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { appointment, membership, timelineEvent } from '@/db/schema';
import { canManageAppointments } from './access';
import type {
  Appointment,
  AppointmentKind,
  AppointmentStatus,
  PrepQuestion,
} from '@/components/appointments/types';

export type ActionError = { ok: false; error: string };
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | ActionError;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';

const KINDS = ['checkup', 'specialist', 'lab', 'imaging', 'therapy', 'dental', 'other'] as const;
const STATUSES = ['scheduled', 'confirmed', 'needs-prep', 'completed', 'cancelled'] as const;

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

type ApptRow = typeof appointment.$inferSelect;
function buildDTO(row: ApptRow): Appointment {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind as AppointmentKind,
    provider: row.provider ?? '',
    location: row.location ?? '',
    start: row.startsAt,
    durationMin: row.durationMin,
    assignedMemberId: row.assignedToMembershipId,
    status: row.status as AppointmentStatus,
    notes: row.notes ?? undefined,
    prep: (row.prep ?? []) as PrepQuestion[],
    visitSummary: row.visitSummary ?? undefined,
    postedToTimeline: row.postedToTimeline,
  };
}

async function validAssignee(
  tx: Parameters<Parameters<typeof withAuthedDb>[0]>[0],
  circleId: string,
  assigneeId: string | null | undefined,
): Promise<string | null> {
  if (!assigneeId) return null;
  const [m] = await tx
    .select({ id: membership.id })
    .from(membership)
    .where(and(eq(membership.id, assigneeId), eq(membership.circleId, circleId), isNull(membership.deletedAt)))
    .limit(1);
  return m?.id ?? null;
}

// ---------------------------------------------------------------------------
// Create / edit (from the Add/Edit form)
// ---------------------------------------------------------------------------

const formSchema = z.object({
  title: z.string().trim().min(1, 'Give the appointment a title').max(160),
  kind: z.enum(KINDS),
  provider: z.string().trim().max(120).optional().default(''),
  location: z.string().trim().max(160).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{1,2}:\d{2}$/),
  durationMin: z.number().int().min(5).max(480),
  assigneeId: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(STATUSES),
});

function readPayload(formData: FormData): unknown {
  const raw = formData.get('payload');
  if (!raw) return {};
  try {
    return JSON.parse(raw.toString());
  } catch {
    return {};
  }
}

/** Schedule a new appointment. Returns the created Appointment for instant reconciliation. */
export async function createAppointment(formData: FormData): Promise<ActionResult<Appointment>> {
  const ctx = await getActorContext();
  serverLog('appointments', 'createAppointment', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageAppointments(ctx.role)) {
    serverLog('appointments', 'createAppointment', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }
  const parsed = formSchema.safeParse(readPayload(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the details.' };
  const p = parsed.data;

  try {
    const row = await withAuthedDb(async (tx) => {
      const assignee = await validAssignee(tx, ctx.circleId, p.assigneeId || undefined);
      const [created] = await tx
        .insert(appointment)
        .values({
          circleId: ctx.circleId,
          title: p.title,
          kind: p.kind,
          provider: p.provider || null,
          location: p.location || null,
          startsAt: new Date(`${p.date}T${p.time}:00`),
          durationMin: p.durationMin,
          assignedToMembershipId: assignee,
          status: p.status,
          createdByMembershipId: ctx.membershipId,
        })
        .returning();

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'appointment',
        summary: `${firstName(ctx.name)} scheduled an appointment: ${p.title}`,
        refType: 'appointment',
        refId: created.id,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'appointment', entityId: created.id, summary: 'Scheduled an appointment' },
        tx,
      );
      return created;
    });
    serverLog('appointments', 'createAppointment', 'success', { actor: ctx.userId, id: row.id });
    return { ok: true, data: buildDTO(row) };
  } catch (err) {
    serverLog('appointments', 'createAppointment', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Edit an appointment's core fields (prep / notes / summary are preserved). Returns the updated row. */
export async function updateAppointment(formData: FormData): Promise<ActionResult<Appointment>> {
  const ctx = await getActorContext();
  serverLog('appointments', 'updateAppointment', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageAppointments(ctx.role)) return { ok: false, error: FORBIDDEN };

  const apptId = z.string().uuid().safeParse(formData.get('id')?.toString());
  const parsed = formSchema.safeParse(readPayload(formData));
  if (!apptId.success || !parsed.success) return { ok: false, error: parsed.success ? GENERIC_ERROR : parsed.error.issues[0]?.message ?? 'Please check the details.' };
  const id = apptId.data;
  const p = parsed.data;

  try {
    const row = await withAuthedDb(async (tx) => {
      const assignee = await validAssignee(tx, ctx.circleId, p.assigneeId || undefined);
      const [updated] = await tx
        .update(appointment)
        .set({
          title: p.title,
          kind: p.kind,
          provider: p.provider || null,
          location: p.location || null,
          startsAt: new Date(`${p.date}T${p.time}:00`),
          durationMin: p.durationMin,
          assignedToMembershipId: assignee,
          status: p.status,
          updatedAt: new Date(),
        })
        .where(and(eq(appointment.id, id), eq(appointment.circleId, ctx.circleId), isNull(appointment.deletedAt)))
        .returning();
      if (!updated) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'appointment', entityId: id, summary: 'Updated an appointment' },
        tx,
      );
      return updated;
    });
    serverLog('appointments', 'updateAppointment', 'success', { actor: ctx.userId, id });
    return { ok: true, data: buildDTO(row) };
  } catch (err) {
    serverLog('appointments', 'updateAppointment', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Patch (from the detail view: assign, prep, notes, summary, post, cancel)
// ---------------------------------------------------------------------------

const prepItemSchema = z.object({ id: z.string().max(80), text: z.string().trim().min(1).max(300), done: z.boolean() });
const patchSchema = z.object({
  assignedMemberId: z.string().uuid().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  notes: z.string().max(2000).optional(),
  prep: z.array(prepItemSchema).max(50).optional(),
  visitSummary: z.string().max(4000).optional(),
  postedToTimeline: z.boolean().optional(),
});

/** Apply a partial update to an appointment (the detail view's many small edits). */
export async function patchAppointment(formData: FormData): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('appointments', 'patchAppointment', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageAppointments(ctx.role)) return { ok: false, error: FORBIDDEN };

  const apptId = z.string().uuid().safeParse(formData.get('id')?.toString());
  let raw: unknown = {};
  try {
    raw = JSON.parse(formData.get('patch')?.toString() ?? '{}');
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed = patchSchema.safeParse(raw);
  if (!apptId.success || !parsed.success) return { ok: false, error: GENERIC_ERROR };
  const id = apptId.data;
  const patch = parsed.data;

  try {
    await withAuthedDb(async (tx) => {
      // Build the update set from only the provided keys.
      const set: Partial<typeof appointment.$inferInsert> = { updatedAt: new Date() };
      if ('assignedMemberId' in patch) set.assignedToMembershipId = await validAssignee(tx, ctx.circleId, patch.assignedMemberId);
      if (patch.status !== undefined) set.status = patch.status;
      if (patch.notes !== undefined) set.notes = patch.notes || null;
      if (patch.prep !== undefined) set.prep = patch.prep;
      if (patch.visitSummary !== undefined) set.visitSummary = patch.visitSummary || null;
      if (patch.postedToTimeline !== undefined) set.postedToTimeline = patch.postedToTimeline;

      const [row] = await tx
        .update(appointment)
        .set(set)
        .where(and(eq(appointment.id, id), eq(appointment.circleId, ctx.circleId), isNull(appointment.deletedAt)))
        .returning({ id: appointment.id, title: appointment.title });
      if (!row) throw new Error('not_found_or_forbidden');

      // Posting the visit summary fans it out to the shared timeline.
      if (patch.postedToTimeline === true && patch.visitSummary && patch.visitSummary.trim()) {
        await tx.insert(timelineEvent).values({
          circleId: ctx.circleId,
          actorMembershipId: ctx.membershipId,
          eventType: 'appointment',
          summary: `${firstName(ctx.name)} shared a visit summary: ${row.title}`,
          refType: 'appointment',
          refId: row.id,
          payload: { body: patch.visitSummary.trim() },
        });
      }

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'appointment', entityId: id, summary: 'Updated an appointment' },
        tx,
      );
    });
    serverLog('appointments', 'patchAppointment', 'success', { actor: ctx.userId, id });
    return { ok: true };
  } catch (err) {
    serverLog('appointments', 'patchAppointment', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
