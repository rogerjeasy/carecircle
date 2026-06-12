import 'server-only';

/**
 * Read layer for the Medications screen — turns the normalized DB rows (medication +
 * medication_schedule + medication_administration) into the exact shapes the client
 * components render (`Medication`, `Dose`, `PrnMed`, `AdherenceSummary`).
 *
 * Security (see AGENTS.md):
 *  - All reads go through `withAuthedDb()` (RLS-scoped) AND are further pinned to the user's
 *    ACTIVE circle, so a member of several circles only ever sees the one they're acting in.
 *  - Reading one's own circle's meds is normal app data → operational `serverLog` only
 *    (no `audit_log` row; the ledger is for state changes / sensitive cross-tenant views).
 */
import { and, between, eq, inArray, isNull } from 'drizzle-orm';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import {
  careRecipientProfile,
  medication,
  medicationSchedule,
  medicationAdministration,
  medicationAttachment,
  membership,
  users,
} from '@/db/schema';
import { resolveStoredUrl } from '@/lib/storage/s3';
import type {
  AdherenceSummary,
  Dose,
  DoseStatus,
  GivenBy,
  MedAttachment,
  Medication,
  MedicationsData,
  Period,
  PrnMed,
} from '@/components/medications/types';

const PRN_DEFAULT_MAX_PER_DAY = 4;

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "08:00" → "8:00am" (matches the client's `to12h`). */
function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const period = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')}${period}`;
}

/** Time-of-day → which part of the day a dose belongs to (drives the Today-tab grouping). */
function periodForHour(h: number): Period {
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}

/** Compact wall-clock label, e.g. "8:04am" (matches the client's `nowTimeLabel`). */
function timeLabel(d: Date): string {
  return format(d, 'h:mma').toLowerCase();
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Someone';
}

type MedRow = typeof medication.$inferSelect;
type ScheduleRow = typeof medicationSchedule.$inferSelect;

/** Build the human schedule summary the cards/print view show (mirrors client `scheduleSummary`). */
function scheduleSummary(med: MedRow, schedules: ScheduleRow[]): string {
  if (med.isPrn) {
    const max = med.prnMaxPerDay ?? null;
    return max ? `As needed · max ${max}/day` : 'As needed';
  }
  if (schedules.length === 0) return 'Schedule not set';
  const times = schedules.map((s) => to12h(s.timeOfDay));
  const freq =
    times.length === 1 ? 'Once daily' : times.length === 2 ? 'Twice daily' : `${times.length}× daily`;
  return `${freq} · ${times.join(', ')}`;
}

/** The DB `dose_status` enum (a superset of the UI's `DoseStatus`, which has no 'taken'). */
type DbDoseStatus = 'given' | 'taken' | 'skipped' | 'refused' | 'missed';

/** A recorded dose's DB status → the UI's collapsed status + who-gave attribution. */
function mapAdministration(status: DbDoseStatus): { uiStatus: DoseStatus; via: GivenBy | undefined } {
  if (status === 'taken') return { uiStatus: 'given', via: 'patient' };
  if (status === 'given') return { uiStatus: 'given', via: 'caregiver' };
  return { uiStatus: status, via: undefined };
}

/** Construct the timestamptz for a schedule occurrence on a given calendar day. */
function occurrenceFor(day: Date, timeOfDay: string): Date {
  const [h, m] = timeOfDay.split(':').map(Number);
  const d = new Date(day);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/**
 * Assemble everything the Medications screen needs for the signed-in user's ACTIVE circle.
 * Returns `null` when the user is unauthenticated or has no active circle (the screen then
 * renders its built-in empty states).
 */
export async function getMedicationsData(): Promise<MedicationsData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('medications', 'getMedicationsData', 'success', {
        email: maskEmail(session.user?.email),
        found: false,
      });
      return null;
    }

    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const weekStart = startOfDay(subDays(now, 6));
    const todayDow = now.getDay();

    const data = await withAuthedDb(async (tx) => {
      // 0) The recipient's profile — their real name (print/share header) and recorded allergies
      //    (the medication form's allergy-conflict safety check).
      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName, allergies: careRecipientProfile.allergies })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1);

      // 1) All of the circle's medications (active, paused, and discontinued — the UI splits them).
      const meds = await tx
        .select()
        .from(medication)
        .where(and(eq(medication.circleId, circleId), isNull(medication.deletedAt)))
        .orderBy(medication.name);

      const medIds = meds.map((m) => m.id);

      // 2) Their schedules.
      const schedules = medIds.length
        ? await tx
            .select()
            .from(medicationSchedule)
            .where(
              and(
                eq(medicationSchedule.circleId, circleId),
                inArray(medicationSchedule.medicationId, medIds),
                isNull(medicationSchedule.deletedAt),
              ),
            )
        : [];

      // 3) Today's recorded scheduled doses (with who administered them).
      const todaysAdmins = await tx
        .select({
          scheduleId: medicationAdministration.scheduleId,
          scheduledFor: medicationAdministration.scheduledFor,
          status: medicationAdministration.status,
          administeredAt: medicationAdministration.administeredAt,
          actorName: users.name,
        })
        .from(medicationAdministration)
        .leftJoin(membership, eq(membership.id, medicationAdministration.administeredByMembershipId))
        .leftJoin(users, eq(users.id, membership.userId))
        .where(
          and(
            eq(medicationAdministration.circleId, circleId),
            between(medicationAdministration.scheduledFor, dayStart, dayEnd),
          ),
        );

      // 4) Attachments (images + documents) for these meds.
      const attachments = medIds.length
        ? await tx
            .select({
              id: medicationAttachment.id,
              medicationId: medicationAttachment.medicationId,
              kind: medicationAttachment.kind,
              s3Key: medicationAttachment.s3Key,
              fileName: medicationAttachment.fileName,
              contentType: medicationAttachment.contentType,
            })
            .from(medicationAttachment)
            .where(
              and(
                eq(medicationAttachment.circleId, circleId),
                inArray(medicationAttachment.medicationId, medIds),
                isNull(medicationAttachment.deletedAt),
              ),
            )
            .orderBy(medicationAttachment.createdAt)
        : [];

      // 5) Last 7 days of recorded doses (for adherence + today's PRN usage).
      const weekAdmins = await tx
        .select({
          medicationId: medicationAdministration.medicationId,
          scheduleId: medicationAdministration.scheduleId,
          status: medicationAdministration.status,
          scheduledFor: medicationAdministration.scheduledFor,
          administeredAt: medicationAdministration.administeredAt,
        })
        .from(medicationAdministration)
        .where(
          and(
            eq(medicationAdministration.circleId, circleId),
            between(medicationAdministration.createdAt, weekStart, dayEnd),
          ),
        );

      return { recipient: recipient ?? null, meds, schedules, todaysAdmins, weekAdmins, attachments };
    });

    const { recipient, meds, schedules, todaysAdmins, weekAdmins, attachments } = data;

    // Resolve S3 keys → short-lived presigned URLs (private bucket) for the pill photo + attachments.
    const photoByMed = new Map<string, string | null>();
    await Promise.all(
      meds.map(async (m) => {
        photoByMed.set(m.id, m.photoS3Key ? await resolveStoredUrl(m.photoS3Key) : null);
      }),
    );
    const attachmentsByMed = new Map<string, MedAttachment[]>();
    await Promise.all(
      attachments.map(async (a) => {
        const url = await resolveStoredUrl(a.s3Key);
        const list = attachmentsByMed.get(a.medicationId) ?? [];
        list.push({
          id: a.id,
          kind: a.kind,
          fileName: a.fileName ?? 'Attachment',
          url,
          contentType: a.contentType ?? undefined,
        });
        attachmentsByMed.set(a.medicationId, list);
      }),
    );

    const schedulesByMed = new Map<string, ScheduleRow[]>();
    for (const s of schedules) {
      const list = schedulesByMed.get(s.medicationId) ?? [];
      list.push(s);
      schedulesByMed.set(s.medicationId, list);
    }

    // ---- Medication[] (the "All medications" list) ----
    const medications: Medication[] = meds.map((m) => {
      const rows = (schedulesByMed.get(m.id) ?? [])
        .slice()
        .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
      return {
        id: m.id,
        name: m.name,
        strength: m.strength ?? '',
        form: titleCase(m.form),
        purpose: m.purpose ?? '',
        schedule: scheduleSummary(m, rows),
        prescriber: m.prescriber ?? 'Unknown',
        supplyDays: m.supplyCount,
        active: m.isActive,
        discontinued: m.discontinuedAt ? true : undefined,
        discontinuedNote: m.discontinuedNote ?? undefined,
        // Structured fields so the Edit form round-trips faithfully.
        route: titleCase(m.route),
        instructions: m.instructions ?? '',
        isPrn: m.isPrn,
        prnMaxPerDay: m.prnMaxPerDay,
        refillThreshold: m.refillThreshold,
        scheduleRows: rows.map((s) => ({
          time: s.timeOfDay,
          days: Array.isArray(s.daysOfWeek) ? s.daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
        })),
        photoUrl: photoByMed.get(m.id) ?? null,
        attachments: attachmentsByMed.get(m.id) ?? [],
      };
    });

    // ---- Dose[] (today's scheduled doses) ----
    const adminByOccurrence = new Map<string, (typeof todaysAdmins)[number]>();
    for (const a of todaysAdmins) {
      if (a.scheduleId && a.scheduledFor) {
        adminByOccurrence.set(`${a.scheduleId}|${a.scheduledFor.toISOString()}`, a);
      }
    }

    const medById = new Map(meds.map((m) => [m.id, m]));
    const doses: Dose[] = [];
    for (const s of schedules) {
      const med = medById.get(s.medicationId);
      if (!med || med.isPrn || !med.isActive || med.discontinuedAt) continue;
      const days = Array.isArray(s.daysOfWeek) ? s.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
      if (!days.includes(todayDow)) continue;

      const scheduledFor = occurrenceFor(now, s.timeOfDay);
      const admin = adminByOccurrence.get(`${s.id}|${scheduledFor.toISOString()}`);

      let status: DoseStatus = 'upcoming';
      let givenAt: string | undefined;
      let givenByName: string | undefined;
      let givenVia: GivenBy | undefined;

      if (admin) {
        const mapped = mapAdministration(admin.status as DbDoseStatus);
        status = mapped.uiStatus;
        givenVia = mapped.via;
        if (mapped.uiStatus === 'given') {
          givenAt = admin.administeredAt ? timeLabel(admin.administeredAt) : undefined;
          givenByName = givenVia === 'patient' ? 'patient' : firstName(admin.actorName);
        }
      } else if (scheduledFor < now) {
        // Past due with no record → surface as missed (the row offers "Log late").
        status = 'missed';
      }

      const [h] = s.timeOfDay.split(':').map(Number);
      doses.push({
        id: `${s.id}|${scheduledFor.toISOString()}`,
        medId: med.id,
        name: med.name,
        strength: med.strength ?? '',
        purpose: med.purpose ?? '',
        time: to12h(s.timeOfDay),
        period: periodForHour(Number.isFinite(h) ? h : 0),
        status,
        givenAt,
        givenByName,
        givenVia,
        scheduleId: s.id,
        scheduledForISO: scheduledFor.toISOString(),
      });
    }
    doses.sort((a, b) =>
      a.scheduledForISO! < b.scheduledForISO!
        ? -1
        : a.scheduledForISO! > b.scheduledForISO!
          ? 1
          : a.name.localeCompare(b.name),
    );

    // ---- PrnMed[] (active as-needed meds + today's usage, counted per med) ----
    const prn: PrnMed[] = meds
      .filter((m) => m.isPrn && m.isActive && !m.discontinuedAt)
      .map((m) => {
        const usesToday = weekAdmins
          .filter(
            (a) =>
              a.medicationId === m.id &&
              a.scheduleId == null &&
              (a.status === 'given' || a.status === 'taken') &&
              a.administeredAt != null &&
              a.administeredAt >= dayStart &&
              a.administeredAt <= dayEnd,
          )
          .sort((x, y) => (x.administeredAt!.getTime() - y.administeredAt!.getTime()));
        const last = usesToday[usesToday.length - 1]?.administeredAt;
        return {
          id: m.id,
          name: m.name,
          strength: m.strength ?? '',
          purpose: m.purpose ?? '',
          maxPerDay: m.prnMaxPerDay ?? PRN_DEFAULT_MAX_PER_DAY,
          takenToday: usesToday.length,
          lastTaken: last ? timeLabel(last) : undefined,
        };
      });

    const adherence = buildAdherence(weekAdmins, now);
    const adherenceByMed = buildAdherenceByMed(weekAdmins);

    serverLog('medications', 'getMedicationsData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      meds: medications.length,
      doses: doses.length,
      prn: prn.length,
    });

    return {
      circleId,
      recipientName: recipient?.fullName ?? null,
      recipientAllergies: recipient?.allergies ?? [],
      meds: medications,
      doses,
      prn,
      adherence,
      adherenceByMed,
    };
  } catch (err) {
    serverLog('medications', 'getMedicationsData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}

/**
 * Build the 7-day adherence summary from recorded SCHEDULED administrations (PRN uses are excluded
 * — adherence tracks the planned regimen). The Today column is recomputed live on the client from
 * the in-progress dose list, so this server snapshot is authoritative only for the prior 6 days.
 */
function buildAdherence(
  weekAdmins: { status: string; scheduleId: string | null; administeredAt: Date | null; scheduledFor: Date | null }[],
  now: Date,
): AdherenceSummary {
  const days: AdherenceSummary['days'] = [];
  let given = 0;
  let missed = 0;
  for (let i = 6; i >= 0; i--) {
    const day = subDays(now, i);
    const ds = startOfDay(day);
    const de = endOfDay(day);
    const cells: ('given' | 'missed' | 'upcoming')[] = [];
    for (const a of weekAdmins) {
      if (a.scheduleId == null) continue; // skip PRN — not part of the scheduled regimen
      const when = a.administeredAt ?? a.scheduledFor;
      if (!when || when < ds || when > de) continue;
      if (a.status === 'given' || a.status === 'taken') {
        cells.push('given');
        given++;
      } else if (a.status === 'skipped' || a.status === 'refused' || a.status === 'missed') {
        cells.push('missed');
        missed++;
      }
    }
    days.push({ date: format(day, 'yyyy-MM-dd'), cells });
  }
  return { given, missed, days };
}

/**
 * Per-medication adherence over the recorded week: of the SCHEDULED doses recorded for each med,
 * the share that were actually given/taken (PRN uses excluded). `null` for meds with no recorded
 * scheduled doses in the window (the clinician table renders these as "—").
 */
function buildAdherenceByMed(
  weekAdmins: { medicationId: string; status: string; scheduleId: string | null }[],
): Record<string, number | null> {
  const tally = new Map<string, { given: number; total: number }>();
  for (const a of weekAdmins) {
    if (a.scheduleId == null) continue; // PRN — not part of the scheduled regimen
    const t = tally.get(a.medicationId) ?? { given: 0, total: 0 };
    if (a.status === 'given' || a.status === 'taken') {
      t.given++;
      t.total++;
    } else if (a.status === 'skipped' || a.status === 'refused' || a.status === 'missed') {
      t.total++;
    }
    tally.set(a.medicationId, t);
  }
  const out: Record<string, number | null> = {};
  for (const [medId, t] of tally) {
    out[medId] = t.total > 0 ? Math.round((t.given / t.total) * 100) : null;
  }
  return out;
}
