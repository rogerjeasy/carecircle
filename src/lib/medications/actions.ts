'use server';

/**
 * Medications server actions — every state change for the Medications screen.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Each action re-checks auth with `requireSession()` and re-authorizes the SPECIFIC action
 *    against the user's REAL membership role in the active circle (never the client's claim).
 *    The DB RLS policies (drizzle/0009) are the final backstop if any check is bypassed.
 *  - All tenant writes run through `withAuthedDb()` (RLS-scoped transactions).
 *  - "Give a medication" is ONE transaction: write the administration, decrement supply, emit a
 *    timeline event, and audit — atomically (Kintwadi-Data-Model.md §transactions).
 *  - Two trails on every action: `serverLog(...)` (start/success/failure) + `recordAuditEvent(...)`
 *    when tenant data changed. Med names are health PII, so the rich create/edit action takes
 *    FormData (a single JSON `payload`) — Next's dev logger never prints FormData contents — and
 *    audit summaries/logs carry ids & counts, never the med name or instructions.
 */
import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { format, startOfDay, endOfDay } from 'date-fns';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { after } from 'next/server';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import {
  medication,
  medicationSchedule,
  medicationAdministration,
  medicationAttachment,
  membership,
  timelineEvent,
  medFormEnum,
  medRouteEnum,
} from '@/db/schema';
import { uploadImageDataUrl, uploadFile, resolveStoredUrl, deleteObject } from '@/lib/storage/s3';
import { canManageMeds, canRecordDoses } from './access';
import type { MedAttachment, Medication } from '@/components/medications/types';

// ---------------------------------------------------------------------------
// Shared types + context
// ---------------------------------------------------------------------------

export type ActionError = { ok: false; error: string };
export type ActionOk<T = undefined> = { ok: true } & (T extends undefined ? object : { data: T });
export type ActionResult<T = undefined> = ActionOk<T> | ActionError;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';

interface ActorContext {
  userId: string;
  email: string | null | undefined;
  name: string | null | undefined;
  circleId: string;
  membershipId: string;
  role: string;
}

/**
 * Resolve the signed-in user's membership in their ACTIVE circle. Returns null if they have no
 * active circle / membership (the caller turns that into a friendly error).
 */
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

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    circleId,
    membershipId: m.id,
    role: m.role,
  };
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Someone';
}

function timeLabel(d: Date): string {
  return format(d, 'h:mma').toLowerCase();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FORM_VALUES = medFormEnum.enumValues as readonly string[];
const ROUTE_VALUES = medRouteEnum.enumValues as readonly string[];

/** Normalize a UI label ("Tablet", "Oral") to a stored enum value, defaulting to 'other'. */
function toFormEnum(v: string): (typeof medFormEnum.enumValues)[number] {
  const lc = v.trim().toLowerCase();
  return (FORM_VALUES.includes(lc) ? lc : 'other') as (typeof medFormEnum.enumValues)[number];
}
function toRouteEnum(v: string): (typeof medRouteEnum.enumValues)[number] {
  const lc = v.trim().toLowerCase();
  return (ROUTE_VALUES.includes(lc) ? lc : 'other') as (typeof medRouteEnum.enumValues)[number];
}

const scheduleRowSchema = z.object({
  time: z.string().regex(/^\d{1,2}:\d{2}$/),
  days: z.array(z.number().int().min(0).max(6)).min(1),
});

const medPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  strength: z.string().trim().max(60).optional().default(''),
  form: z.string().trim().max(40).optional().default('tablet'),
  route: z.string().trim().max(40).optional().default('oral'),
  purpose: z.string().trim().max(120).optional().default(''),
  prescriber: z.string().trim().max(80).optional().default(''),
  instructions: z.string().trim().max(280).optional().default(''),
  // Only an https URL is stored as-is; data URLs are dropped here (photo upload is best-effort
  // elsewhere and never blocks saving a medication).
  photoUrl: z.string().nullable().optional().default(null),
  isPrn: z.boolean().optional().default(false),
  schedules: z.array(scheduleRowSchema).max(12).optional().default([]),
  supplyCount: z.number().int().min(0).max(3650).optional().default(0),
  refillThreshold: z.number().int().min(0).max(365).optional().default(7),
});

type MedPayload = z.infer<typeof medPayloadSchema>;

/** Parse the single JSON `payload` field carried by the form's FormData. */
function readPayload(formData: FormData): unknown {
  const raw = formData.get('payload');
  if (!raw) return {};
  try {
    return JSON.parse(raw.toString());
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Builders (DB row → the client's Medication shape, so the UI reconciles instantly)
// ---------------------------------------------------------------------------

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const period = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')}${period}`;
}
function scheduleSummaryFromPayload(p: MedPayload): string {
  if (p.isPrn) return 'As needed';
  if (p.schedules.length === 0) return 'Schedule not set';
  const times = p.schedules.map((s) => to12h(s.time));
  const freq =
    times.length === 1 ? 'Once daily' : times.length === 2 ? 'Twice daily' : `${times.length}× daily`;
  return `${freq} · ${times.join(', ')}`;
}

function buildMedicationDTO(
  row: typeof medication.$inferSelect,
  p: MedPayload,
  extra: { photoUrl: string | null; attachments: MedAttachment[] },
): Medication {
  return {
    id: row.id,
    name: row.name,
    strength: row.strength ?? '',
    form: titleCase(row.form),
    purpose: row.purpose ?? '',
    schedule: scheduleSummaryFromPayload(p),
    prescriber: row.prescriber ?? 'Unknown',
    supplyDays: row.supplyCount,
    active: row.isActive,
    discontinued: row.discontinuedAt ? true : undefined,
    discontinuedNote: row.discontinuedNote ?? undefined,
    // Structured fields so an immediate re-edit (before any reload) round-trips faithfully.
    route: titleCase(row.route),
    instructions: row.instructions ?? '',
    isPrn: row.isPrn,
    prnMaxPerDay: row.prnMaxPerDay,
    refillThreshold: row.refillThreshold,
    scheduleRows: p.isPrn ? [] : p.schedules.map((s) => ({ time: s.time, days: s.days })),
    photoUrl: extra.photoUrl,
    attachments: extra.attachments,
  };
}

/** A `data:` image URL the in-browser PhotoUpload produces (vs. an empty/absent value). */
function isImageDataUrl(v: string | null | undefined): v is string {
  return typeof v === 'string' && /^data:image\//i.test(v);
}

// ---------------------------------------------------------------------------
// Manage actions (owner / family_admin)
// ---------------------------------------------------------------------------

/** Add a medication (+ its schedules). Returns the created Medication for instant reconciliation. */
export async function createMedication(formData: FormData): Promise<ActionResult<Medication>> {
  const ctx = await getActorContext();
  serverLog('medications', 'createMedication', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageMeds(ctx.role)) {
    serverLog('medications', 'createMedication', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const parsed = medPayloadSchema.safeParse(readPayload(formData));
  if (!parsed.success) {
    serverLog('medications', 'createMedication', 'failure', { actor: ctx.userId, reason: 'validation' });
    return { ok: false, error: 'Please check the medication details.' };
  }
  const p = parsed.data;
  // Upload the pill photo (a data: URL from the in-browser uploader) to S3 first — the key is
  // partitioned under this circle's medications/images prefix. Best-effort: a photo hiccup never
  // blocks creating the medication.
  const photoKey = isImageDataUrl(p.photoUrl)
    ? await uploadImageDataUrl({ circleId: ctx.circleId, category: 'medications/images', dataUrl: p.photoUrl })
    : null;

  try {
    const row = await withAuthedDb(async (tx) => {
      const [created] = await tx
        .insert(medication)
        .values({
          circleId: ctx.circleId,
          name: p.name,
          strength: p.strength || null,
          form: toFormEnum(p.form),
          route: toRouteEnum(p.route),
          purpose: p.purpose || null,
          prescriber: p.prescriber || null,
          instructions: p.instructions || null,
          photoS3Key: photoKey,
          supplyCount: p.supplyCount,
          refillThreshold: p.refillThreshold,
          isPrn: p.isPrn,
          isActive: true,
        })
        .returning();

      if (!p.isPrn && p.schedules.length > 0) {
        await tx.insert(medicationSchedule).values(
          p.schedules.map((s) => ({
            circleId: ctx.circleId,
            medicationId: created.id,
            timeOfDay: s.time,
            daysOfWeek: s.days,
          })),
        );
      }

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'med',
        summary: `${firstName(ctx.name)} added ${p.name} to the medication list.`,
        refType: 'medication',
        refId: created.id,
      });

      await recordAuditEvent(
        ctx.userId,
        {
          circleId: ctx.circleId,
          action: 'create',
          entityType: 'medication',
          entityId: created.id,
          summary: `Added a medication (${created.form}${p.isPrn ? ', PRN' : ''})`,
        },
        tx,
      );

      return created;
    });

    const photoUrl = await resolveStoredUrl(row.photoS3Key);
    const dto = buildMedicationDTO(row, p, { photoUrl, attachments: [] });
    serverLog('medications', 'createMedication', 'success', { actor: ctx.userId, id: dto.id });
    return { ok: true, data: dto };
  } catch (err) {
    serverLog('medications', 'createMedication', 'failure', {
      actor: ctx.userId,
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Edit a medication and replace its schedules. Returns the updated Medication. */
export async function updateMedication(formData: FormData): Promise<ActionResult<Medication>> {
  const ctx = await getActorContext();
  serverLog('medications', 'updateMedication', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageMeds(ctx.role)) {
    serverLog('medications', 'updateMedication', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const medId = z.string().uuid().safeParse(formData.get('id')?.toString());
  const parsed = medPayloadSchema.safeParse(readPayload(formData));
  if (!medId.success || !parsed.success) {
    serverLog('medications', 'updateMedication', 'failure', { actor: ctx.userId, reason: 'validation' });
    return { ok: false, error: 'Please check the medication details.' };
  }
  const id = medId.data;
  const p = parsed.data;
  // A new pill photo (data: URL) replaces the stored one; otherwise leave it unchanged
  // (the form doesn't re-send the existing photo, so a missing value must NOT wipe it).
  const newPhotoKey = isImageDataUrl(p.photoUrl)
    ? await uploadImageDataUrl({ circleId: ctx.circleId, category: 'medications/images', dataUrl: p.photoUrl })
    : undefined;

  try {
    const result = await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(medication)
        .set({
          name: p.name,
          strength: p.strength || null,
          form: toFormEnum(p.form),
          route: toRouteEnum(p.route),
          purpose: p.purpose || null,
          prescriber: p.prescriber || null,
          instructions: p.instructions || null,
          ...(newPhotoKey !== undefined ? { photoS3Key: newPhotoKey } : {}),
          supplyCount: p.supplyCount,
          refillThreshold: p.refillThreshold,
          isPrn: p.isPrn,
          updatedAt: new Date(),
        })
        .where(and(eq(medication.id, id), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .returning();

      if (!row) throw new Error('not_found_or_forbidden');

      // Schedules are true children → hard-replace (drop & re-create).
      await tx.delete(medicationSchedule).where(eq(medicationSchedule.medicationId, id));
      if (!p.isPrn && p.schedules.length > 0) {
        await tx.insert(medicationSchedule).values(
          p.schedules.map((s) => ({
            circleId: ctx.circleId,
            medicationId: id,
            timeOfDay: s.time,
            daysOfWeek: s.days,
          })),
        );
      }

      // Surviving attachments (to keep them on the reconciled card without a reload).
      const atts = await tx
        .select({
          id: medicationAttachment.id,
          kind: medicationAttachment.kind,
          s3Key: medicationAttachment.s3Key,
          fileName: medicationAttachment.fileName,
          contentType: medicationAttachment.contentType,
        })
        .from(medicationAttachment)
        .where(and(eq(medicationAttachment.medicationId, id), isNull(medicationAttachment.deletedAt)))
        .orderBy(medicationAttachment.createdAt);

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'med',
        summary: `${firstName(ctx.name)} updated ${p.name}.`,
        refType: 'medication',
        refId: id,
      });

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'medication', entityId: id, summary: 'Updated a medication' },
        tx,
      );

      return { row, atts };
    });

    const photoUrl = await resolveStoredUrl(result.row.photoS3Key);
    const attachments: MedAttachment[] = await Promise.all(
      result.atts.map(async (a) => ({
        id: a.id,
        kind: a.kind,
        fileName: a.fileName ?? 'Attachment',
        url: await resolveStoredUrl(a.s3Key),
        contentType: a.contentType ?? undefined,
      })),
    );
    const dto = buildMedicationDTO(result.row, p, { photoUrl, attachments });

    serverLog('medications', 'updateMedication', 'success', { actor: ctx.userId, id });
    return { ok: true, data: dto };
  } catch (err) {
    serverLog('medications', 'updateMedication', 'failure', {
      actor: ctx.userId,
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Pause / resume a medication (the card's Active switch). */
export async function setMedicationActive(medId: string, active: boolean): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'setMedicationActive', 'start', { actor: ctx?.userId, active });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageMeds(ctx.role)) return { ok: false, error: FORBIDDEN };

  const id = z.string().uuid().safeParse(medId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(medication)
        .set({ isActive: active, updatedAt: new Date() })
        .where(and(eq(medication.id, id.data), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .returning({ id: medication.id, name: medication.name });
      if (!row) throw new Error('not_found_or_forbidden');

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'med',
        summary: `${firstName(ctx.name)} ${active ? 'resumed' : 'paused'} ${row.name}.`,
        refType: 'medication',
        refId: row.id,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'medication', entityId: row.id, summary: active ? 'Resumed a medication' : 'Paused a medication' },
        tx,
      );
    });
    serverLog('medications', 'setMedicationActive', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'setMedicationActive', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Permanently stop a medication (kept for history). */
export async function discontinueMedication(medId: string, note?: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'discontinueMedication', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageMeds(ctx.role)) return { ok: false, error: FORBIDDEN };

  const id = z.string().uuid().safeParse(medId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };
  const cleanNote = (note ?? '').toString().trim().slice(0, 200) || null;

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(medication)
        .set({ discontinuedAt: new Date(), discontinuedNote: cleanNote, isActive: false, updatedAt: new Date() })
        .where(and(eq(medication.id, id.data), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .returning({ id: medication.id, name: medication.name });
      if (!row) throw new Error('not_found_or_forbidden');

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'med',
        summary: `${firstName(ctx.name)} discontinued ${row.name}.`,
        refType: 'medication',
        refId: row.id,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'medication', entityId: row.id, summary: 'Discontinued a medication' },
        tx,
      );
    });
    serverLog('medications', 'discontinueMedication', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'discontinueMedication', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Bring a discontinued medication back. */
export async function reactivateMedication(medId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'reactivateMedication', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageMeds(ctx.role)) return { ok: false, error: FORBIDDEN };

  const id = z.string().uuid().safeParse(medId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(medication)
        .set({ discontinuedAt: null, discontinuedNote: null, isActive: true, updatedAt: new Date() })
        .where(and(eq(medication.id, id.data), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .returning({ id: medication.id, name: medication.name });
      if (!row) throw new Error('not_found_or_forbidden');

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'med',
        summary: `${firstName(ctx.name)} reactivated ${row.name}.`,
        refType: 'medication',
        refId: row.id,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'medication', entityId: row.id, summary: 'Reactivated a medication' },
        tx,
      );
    });
    serverLog('medications', 'reactivateMedication', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'reactivateMedication', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Dose recording (owner / family_admin / family / caregiver / care_recipient)
// ---------------------------------------------------------------------------

const recordDoseSchema = z.object({
  medId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  scheduledForISO: z.string().datetime(),
  outcome: z.enum(['given', 'skipped', 'refused']),
  via: z.enum(['patient', 'caregiver']).optional(),
});

export type RecordDoseInput = z.infer<typeof recordDoseSchema>;

/**
 * Record the outcome of a scheduled dose (given / taken / skipped / refused). The "give" path is
 * the atomic transaction from the data model: administration + supply decrement + timeline + audit.
 */
export async function recordDose(input: RecordDoseInput): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'recordDose', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canRecordDoses(ctx.role)) {
    serverLog('medications', 'recordDose', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const parsed = recordDoseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const { medId, scheduleId, scheduledForISO, outcome, via } = parsed.data;
  const scheduledFor = new Date(scheduledForISO);
  const isGiven = outcome === 'given';
  const dbStatus = isGiven ? (via === 'patient' ? 'taken' : 'given') : outcome;
  const now = new Date();

  try {
    const summary = await withAuthedDb(async (tx) => {
      // Validate the med belongs to the active circle (RLS also enforces this).
      const [med] = await tx
        .select({ id: medication.id, name: medication.name, strength: medication.strength })
        .from(medication)
        .where(and(eq(medication.id, medId), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .limit(1);
      if (!med) throw new Error('not_found_or_forbidden');

      // One record per occurrence: insert, or update an earlier outcome for the same slot.
      await tx
        .insert(medicationAdministration)
        .values({
          circleId: ctx.circleId,
          medicationId: medId,
          scheduleId,
          scheduledFor,
          status: dbStatus,
          administeredAt: isGiven ? now : null,
          administeredByMembershipId: ctx.membershipId,
        })
        .onConflictDoUpdate({
          target: [medicationAdministration.scheduleId, medicationAdministration.scheduledFor],
          set: {
            status: dbStatus,
            administeredAt: isGiven ? now : null,
            administeredByMembershipId: ctx.membershipId,
          },
        });

      // Decrement remaining supply on a real administration (floored at 0).
      if (isGiven) {
        await tx
          .update(medication)
          .set({ supplyCount: sql`greatest(${medication.supplyCount} - 1, 0)`, updatedAt: now })
          .where(and(eq(medication.id, medId), eq(medication.circleId, ctx.circleId)));
      }

      const label = `${med.name}${med.strength ? ` ${med.strength}` : ''}`;
      const summary = isGiven
        ? via === 'patient'
          ? `${med.name} taken by the patient.`
          : `${firstName(ctx.name)} gave ${label}.`
        : `${label} marked ${outcome}.`;

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'med',
        summary,
        refType: 'medication',
        refId: medId,
        isUrgent: outcome === 'refused',
      });

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'medication_administration', entityId: medId, summary: `Recorded a dose (${dbStatus})` },
        tx,
      );
      return summary;
    });

    serverLog('medications', 'recordDose', 'success', { actor: ctx.userId, status: dbStatus });
    // Notify the circle (Email/Push) per each member's prefs — best-effort, runs after the response.
    after(() =>
      dispatchNotification({
        circleId: ctx.circleId,
        type: 'meds',
        urgent: outcome === 'refused',
        title: outcome === 'refused' ? 'Medication refused' : isGiven ? 'Medication given' : 'Dose update',
        body: summary,
        path: '/medications',
        excludeUserId: ctx.userId,
      }),
    );
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'recordDose', 'failure', { actor: ctx.userId, reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

const undoDoseSchema = z.object({
  scheduleId: z.string().uuid(),
  scheduledForISO: z.string().datetime(),
});

/** Undo a recorded scheduled dose (delete the record; restore supply if it had been given). */
export async function undoDose(input: z.infer<typeof undoDoseSchema>): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'undoDose', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canRecordDoses(ctx.role)) return { ok: false, error: FORBIDDEN };

  const parsed = undoDoseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC_ERROR };
  const scheduledFor = new Date(parsed.data.scheduledForISO);

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .delete(medicationAdministration)
        .where(
          and(
            eq(medicationAdministration.circleId, ctx.circleId),
            eq(medicationAdministration.scheduleId, parsed.data.scheduleId),
            eq(medicationAdministration.scheduledFor, scheduledFor),
          ),
        )
        .returning({ medicationId: medicationAdministration.medicationId, status: medicationAdministration.status });
      if (!row) return; // nothing recorded → nothing to undo

      if (row.status === 'given' || row.status === 'taken') {
        await tx
          .update(medication)
          .set({ supplyCount: sql`${medication.supplyCount} + 1`, updatedAt: new Date() })
          .where(and(eq(medication.id, row.medicationId), eq(medication.circleId, ctx.circleId)));
      }

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'medication_administration', entityId: row.medicationId, summary: 'Undid a recorded dose' },
        tx,
      );
    });
    serverLog('medications', 'undoDose', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'undoDose', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Log one use of an as-needed (PRN) medication, enforcing the per-day cap server-side. */
export async function logPrn(medId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'logPrn', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canRecordDoses(ctx.role)) return { ok: false, error: FORBIDDEN };

  const id = z.string().uuid().safeParse(medId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };
  const now = new Date();

  try {
    const result = await withAuthedDb(async (tx) => {
      const [med] = await tx
        .select({ id: medication.id, name: medication.name, isPrn: medication.isPrn, prnMaxPerDay: medication.prnMaxPerDay })
        .from(medication)
        .where(and(eq(medication.id, id.data), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .limit(1);
      if (!med || !med.isPrn) throw new Error('not_found_or_forbidden');

      // Enforce the daily ceiling against what's actually recorded today.
      const max = med.prnMaxPerDay ?? 4;
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(medicationAdministration)
        .where(
          and(
            eq(medicationAdministration.medicationId, med.id),
            isNull(medicationAdministration.scheduleId),
            sql`${medicationAdministration.administeredAt} between ${startOfDay(now)} and ${endOfDay(now)}`,
          ),
        );
      if (count >= max) return { capped: true as const };

      await tx.insert(medicationAdministration).values({
        circleId: ctx.circleId,
        medicationId: med.id,
        scheduleId: null,
        scheduledFor: null,
        status: 'given',
        administeredAt: now,
        administeredByMembershipId: ctx.membershipId,
      });

      await tx
        .update(medication)
        .set({ supplyCount: sql`greatest(${medication.supplyCount} - 1, 0)`, updatedAt: now })
        .where(and(eq(medication.id, med.id), eq(medication.circleId, ctx.circleId)));

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'med',
        summary: `${firstName(ctx.name)} logged ${med.name} (as needed) at ${timeLabel(now)}.`,
        refType: 'medication',
        refId: med.id,
      });

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'medication_administration', entityId: med.id, summary: 'Logged a PRN dose' },
        tx,
      );
      return { capped: false as const };
    });

    if (result.capped) {
      serverLog('medications', 'logPrn', 'failure', { actor: ctx.userId, reason: 'daily_cap' });
      return { ok: false, error: 'Daily limit reached for this medication.' };
    }
    serverLog('medications', 'logPrn', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'logPrn', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Create a refill request (recorded on the timeline + audit; no dedicated tasks table yet). */
export async function createRefillTask(medId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'createRefillTask', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canRecordDoses(ctx.role)) return { ok: false, error: FORBIDDEN };

  const id = z.string().uuid().safeParse(medId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [med] = await tx
        .select({ id: medication.id, name: medication.name })
        .from(medication)
        .where(and(eq(medication.id, id.data), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .limit(1);
      if (!med) throw new Error('not_found_or_forbidden');

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'task',
        summary: `${firstName(ctx.name)} requested a refill for ${med.name}.`,
        refType: 'medication',
        refId: med.id,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'task', entityId: med.id, summary: 'Requested a medication refill' },
        tx,
      );
    });
    serverLog('medications', 'createRefillTask', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'createRefillTask', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Attachments (images + documents) — manage only (owner / family_admin)
// ---------------------------------------------------------------------------

/**
 * Upload one file (image OR document) to a medication. The bytes go to S3 under this circle's
 * medications/{images|documents} prefix; the row holds the key + metadata. Returns the attachment
 * with a resolved (presigned) URL so the UI can show it immediately.
 */
export async function uploadMedicationAttachment(formData: FormData): Promise<ActionResult<MedAttachment>> {
  const ctx = await getActorContext();
  serverLog('medications', 'uploadAttachment', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageMeds(ctx.role)) {
    serverLog('medications', 'uploadAttachment', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const medId = z.string().uuid().safeParse(formData.get('medId')?.toString());
  const kind = z.enum(['image', 'document']).safeParse(formData.get('kind')?.toString());
  const file = formData.get('file');
  if (!medId.success || !kind.success || !(file instanceof File) || file.size === 0) {
    serverLog('medications', 'uploadAttachment', 'failure', { actor: ctx.userId, reason: 'validation' });
    return { ok: false, error: 'Please choose a valid file.' };
  }

  try {
    // Confirm the med belongs to the active circle before uploading (RLS also enforces this).
    const [med] = await withAuthedDb((tx) =>
      tx
        .select({ id: medication.id })
        .from(medication)
        .where(and(eq(medication.id, medId.data), eq(medication.circleId, ctx.circleId), isNull(medication.deletedAt)))
        .limit(1),
    );
    if (!med) return { ok: false, error: 'Medication not found.' };

    const category = kind.data === 'image' ? 'medications/images' : 'medications/documents';
    const uploaded = await uploadFile({ circleId: ctx.circleId, category, file });
    if (!uploaded) {
      serverLog('medications', 'uploadAttachment', 'failure', { actor: ctx.userId, reason: 'storage' });
      return { ok: false, error: 'Upload failed. Check that file storage is configured.' };
    }

    const [row] = await withAuthedDb(async (tx) => {
      const inserted = await tx
        .insert(medicationAttachment)
        .values({
          circleId: ctx.circleId,
          medicationId: medId.data,
          kind: kind.data,
          s3Key: uploaded.key,
          fileName: uploaded.fileName,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.size,
          uploadedByMembershipId: ctx.membershipId,
        })
        .returning({ id: medicationAttachment.id });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'medication_attachment', entityId: medId.data, summary: `Added a medication ${kind.data}` },
        tx,
      );
      return inserted;
    });

    const url = await resolveStoredUrl(uploaded.key);
    serverLog('medications', 'uploadAttachment', 'success', { actor: ctx.userId, id: row.id, kind: kind.data });
    return {
      ok: true,
      data: { id: row.id, kind: kind.data, fileName: uploaded.fileName, url, contentType: uploaded.contentType },
    };
  } catch (err) {
    serverLog('medications', 'uploadAttachment', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Remove a medication attachment (soft-delete the row, then best-effort delete the S3 object). */
export async function deleteMedicationAttachment(attachmentId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('medications', 'deleteAttachment', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageMeds(ctx.role)) return { ok: false, error: FORBIDDEN };

  const id = z.string().uuid().safeParse(attachmentId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    const removedKey = await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(medicationAttachment)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(medicationAttachment.id, id.data),
            eq(medicationAttachment.circleId, ctx.circleId),
            isNull(medicationAttachment.deletedAt),
          ),
        )
        .returning({ s3Key: medicationAttachment.s3Key, medicationId: medicationAttachment.medicationId });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'medication_attachment', entityId: row.medicationId, summary: 'Removed a medication attachment' },
        tx,
      );
      return row.s3Key;
    });

    await deleteObject(removedKey); // best-effort; the row is already gone for the UI
    serverLog('medications', 'deleteAttachment', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('medications', 'deleteAttachment', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
