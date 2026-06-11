/**
 * CareCircle domain schema (first slice).
 * Design principles (see ../../../CareCircle-Data-Model.md):
 *  - Every tenant-scoped row carries `circle_id` so Row-Level Security is a single indexed check.
 *  - Audit columns on every table; soft-delete via `deleted_at`.
 *  - Controlled vocabularies via pg enums.
 * RLS policies for these tables are applied in the SQL migration `drizzle/*_rls_policies.sql`.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  date,
  integer,
  doublePrecision,
  index,
  unique,
  uniqueIndex,
  check,
  vector,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

// ---- Controlled vocabularies ----
export const roleEnum = pgEnum('role', [
  'owner',
  'family_admin',
  'family',
  'caregiver',
  'read_only',
  'care_recipient',
  'clinician',
]);
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'invited', 'suspended']);
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);
export const timelineEventTypeEnum = pgEnum('timeline_event_type', [
  'med',
  'vital',
  'appointment',
  'task',
  'note',
  'incident',
  'document',
  'system',
]);
export const visibilityEnum = pgEnum('visibility', ['all', 'family_only', 'clinical', 'private']);
export const auditActionEnum = pgEnum('audit_action', [
  'read',
  'create',
  'update',
  'delete',
  'export',
  'login',
  'logout',
  'invite',
]);

// Medication controlled vocabularies (mirror the Add/Edit form's option lists in
// src/components/medications/schema.ts so the UI selects map 1:1 onto stored values).
export const medFormEnum = pgEnum('med_form', [
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'patch',
  'inhaler',
  'drops',
  'cream',
  'other',
]);
export const medRouteEnum = pgEnum('med_route', [
  'oral',
  'sublingual',
  'topical',
  'inhaled',
  'injection',
  'ophthalmic',
  'nasal',
  'other',
]);
// Outcome of a single dose. `given` = administered by a caregiver, `taken` = self-administered by
// the recipient — the UI collapses both to "given" but keeps the distinction in attribution.
// `missed` is a derived state for past-due scheduled doses with no record; it is also persistable
// (e.g. a future reconciliation job) without changing this enum.
export const doseStatusEnum = pgEnum('dose_status', [
  'given',
  'taken',
  'skipped',
  'refused',
  'missed',
]);
// Medication attachments are either images (pill photos, scans) or documents (leaflets, PDFs).
export const medAttachmentKindEnum = pgEnum('med_attachment_kind', ['image', 'document']);

// ---- Documents vault vocabularies (mirror src/components/documents/types.ts) ----
export const docCategoryEnum = pgEnum('doc_category', [
  'medical',
  'insurance',
  'legal',
  'financial',
  'id',
  'advance-directive',
]);
// Sensitivity drives the document RLS tiers (standard → all members; sensitive → care team + family;
// restricted → coordinators/family). See drizzle/0015_documents_rls.sql.
export const docSensitivityEnum = pgEnum('doc_sensitivity', ['standard', 'sensitive', 'restricted']);
export const docKindEnum = pgEnum('doc_kind', ['pdf', 'image', 'doc']);

// Tasks vocabularies (mirror src/components/tasks/types.ts).
export const taskCategoryEnum = pgEnum('task_category', ['errand', 'medical', 'admin', 'refill', 'visit']);
export const taskStatusEnum = pgEnum('task_status', ['open', 'doing', 'done']);

// Appointments vocabularies (mirror src/components/appointments/types.ts).
export const apptKindEnum = pgEnum('appt_kind', [
  'checkup',
  'specialist',
  'lab',
  'imaging',
  'therapy',
  'dental',
  'other',
]);
export const apptStatusEnum = pgEnum('appt_status', [
  'scheduled',
  'confirmed',
  'needs-prep',
  'completed',
  'cancelled',
]);

// Health observation metrics (mirror src/components/health/types.ts MetricKey).
export const observationMetricEnum = pgEnum('observation_metric', [
  'bp',
  'glucose',
  'weight',
  'sleep',
  'mood',
  'hr',
]);

// Care rota shift kinds (mirror src/components/rota/types.ts ShiftType).
export const shiftTypeEnum = pgEnum('shift_type', ['in-person', 'on-call']);

// Incidents vocabularies (mirror src/components/incidents/types.ts). The enum type names are
// suffixed so they don't collide with the `incident` table's implicit row type.
export const incidentTypeEnum = pgEnum('incident_type', ['fall', 'hospitalization', 'emergency', 'other']);
export const incidentSeverityEnum = pgEnum('incident_severity', ['low', 'medium', 'high']);
export const incidentStatusEnum = pgEnum('incident_status', ['open', 'resolved']);
// Per-recipient acknowledgement state for a notified member.
export const incidentAckEnum = pgEnum('incident_ack', ['pending', 'seen', 'acknowledged']);

// Shared audit columns.
const audit = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// ---- The tenant: a circle of care around one recipient ----
export const careCircle = pgTable('care_circle', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),
  primaryTimezone: text('primary_timezone').notNull().default('UTC'),
  ownerMembershipId: uuid('owner_membership_id'),
  // ---- Nightly Daily Digest auto-send (see src/lib/digest/cron.ts) ----
  // When enabled, the hourly digest job generates the day's digest and emails opted-in members at
  // `digestHour` (0–23) in the circle's `primaryTimezone`. `lastDigestSentDate` is the circle-local
  // calendar day (yyyy-MM-dd) we last auto-sent for — the idempotency guard against double-sends.
  digestEnabled: boolean('digest_enabled').notNull().default(true),
  digestHour: integer('digest_hour').notNull().default(20),
  lastDigestSentDate: date('last_digest_sent_date'),
  ...audit,
});

// ---- The person being cared for (1:1 with a circle) ----
export const careRecipientProfile = pgTable('care_recipient_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  circleId: uuid('circle_id')
    .notNull()
    .unique()
    .references(() => careCircle.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  dateOfBirth: date('date_of_birth'),
  // Recipient photo. Holds an S3 object key (e.g. `care-circles/<id>/recipient-photos/<uuid>.jpg`)
  // uploaded during onboarding via src/lib/storage/s3.ts; may also hold an external https URL.
  // Resolve to a viewable, short-lived URL with `resolveStoredUrl()` (the bucket is private).
  avatarUrl: text('avatar_url'),
  bloodType: text('blood_type'),
  conditions: jsonb('conditions').$type<string[]>().default([]),
  allergies: jsonb('allergies').$type<string[]>().default([]),
  mobility: text('mobility'),
  dietaryNeeds: text('dietary_needs'),
  preferences: text('preferences'),
  primaryLanguage: text('primary_language'),
  // Free-text advance directive shown on the emergency card, e.g. "DNR on file".
  advanceDirective: text('advance_directive'),
  emergencyContacts: jsonb('emergency_contacts').$type<unknown[]>().default([]),
  insuranceSummary: jsonb('insurance_summary'),
  ...audit,
});

// ---- The access principal: a user's role inside one circle ----
export const membership = pgTable(
  'membership',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    status: membershipStatusEnum('status').notNull().default('active'),
    relationshipLabel: text('relationship_label'),
    // Contact phone for this member, surfaced on the emergency card (callable). Optional.
    phone: text('phone'),
    notifyEscalations: boolean('notify_escalations').notNull().default(true),
    // Whether this member receives the nightly Daily Digest email. On by default; a member can
    // opt out (e.g. the on-site caregiver who already lived the day) without leaving the circle.
    notifyDigest: boolean('notify_digest').notNull().default(true),
    // BCP-47-ish language code ('en', 'tl', 'es', …) this member reads the Daily Digest in.
    // Null = English. Drives the digest screen's "read in my language" view AND which translation
    // of the digest email they receive — the diaspora circle reads the same day in different tongues.
    preferredLanguage: text('preferred_language'),
    // Per-member Settings → Notifications preferences: the type×channel matrix + quiet hours.
    // Null until first saved (the UI then falls back to its defaults). A personal preference blob.
    notificationPrefs: jsonb('notification_prefs').$type<{
      matrix: Record<string, Record<string, boolean>>;
      quiet: { enabled: boolean; from: string; to: string };
    }>(),
    ...audit,
  },
  (t) => [
    unique('membership_circle_user_uq').on(t.circleId, t.userId),
    index('membership_user_idx').on(t.userId),
    index('membership_circle_idx').on(t.circleId),
  ],
);

// ---- The activity-stream spine: one fast, RLS-filterable feed ----
export const timelineEvent = pgTable(
  'timeline_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    actorMembershipId: uuid('actor_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    eventType: timelineEventTypeEnum('event_type').notNull(),
    summary: text('summary').notNull(),
    refType: text('ref_type'),
    refId: uuid('ref_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    visibility: visibilityEnum('visibility').notNull().default('all'),
    isUrgent: boolean('is_urgent').notNull().default(false),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('timeline_circle_time_idx').on(t.circleId, t.occurredAt)],
);

// ---- Append-only accountability ledger (no UPDATE/DELETE policy = immutable) ----
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id').notNull(),
    actorUserId: text('actor_user_id'),
    actorMembershipId: uuid('actor_membership_id'),
    action: auditActionEnum('action').notNull(),
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    summary: text('summary'),
    requestId: text('request_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('audit_circle_time_idx').on(t.circleId, t.occurredAt)],
);

/**
 * Platform-level auth audit: one row per sign-in / sign-out, independent of any circle.
 *
 * The circle-scoped `audit_log` above fans an auth event out per circle the user belongs to (so a
 * circle's coordinators can see when a member accessed the record). That model structurally CANNOT
 * record a sign-in for a user with no circle — every platform admin, and any brand-new user before
 * they join one — and it counts a single sign-in once *per circle*. This table is the canonical,
 * one-row-per-event source for "who signed in/out, when", used by the /admin metrics.
 *
 * Written and read ONLY via the privileged admin connection (see db/admin-db.ts), like the Auth.js
 * identity tables it has NO RLS policy — it holds no tenant data and is never queried by the app
 * (least-privilege) role in a request handler.
 */
export const platformAuthAudit = pgTable(
  'platform_auth_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: text('actor_user_id').notNull(),
    action: auditActionEnum('action').notNull(), // only 'login' | 'logout' are written
    provider: text('provider'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('platform_auth_audit_time_idx').on(t.occurredAt)],
);

// ---- Onboarding into a circle: a pending invite a coordinator issues to a new member ----
export const invitation = pgTable(
  'invitation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: roleEnum('role').notNull(),
    // What the invitee will be called inside the circle (e.g. "Son", "Home aide"). Optional.
    relationshipLabel: text('relationship_label'),
    // High-entropy, URL-safe capability token embedded in the /invite/<token> link. Unique so
    // each link resolves to exactly one invitation; unguessable so the link itself is the secret.
    token: text('token').notNull().unique(),
    invitedByMembershipId: uuid('invited_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    status: invitationStatusEnum('status').notNull().default('pending'),
    personalNote: text('personal_note'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    ...audit,
  },
  (t) => [
    index('invitation_circle_idx').on(t.circleId),
    index('invitation_email_idx').on(t.email),
  ],
);

// ============================================================================
// Medications (see ../../../CareCircle-Data-Model.md §medication)
// A medication is a prescribed regimen; its schedules expand into per-day dose
// occurrences; each occurrence (and every PRN use) is logged as one immutable
// administration row. The "give a medication" flow writes the administration,
// decrements supply, and emits a timeline event in ONE transaction.
// ============================================================================

// ---- A prescribed (or as-needed) regimen ----
export const medication = pgTable(
  'medication',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    strength: text('strength'),
    form: medFormEnum('form').notNull().default('tablet'),
    route: medRouteEnum('route').notNull().default('oral'),
    purpose: text('purpose'),
    prescriber: text('prescriber'),
    instructions: text('instructions'),
    // S3 object key for the pill photo (private bucket; resolve with resolveStoredUrl()).
    photoS3Key: text('photo_s3_key'),
    // Units (days or doses) currently on hand; the UI surfaces this as the supply pill.
    supplyCount: integer('supply_count').notNull().default(0),
    // Warn / offer a refill once supply drops to this level.
    refillThreshold: integer('refill_threshold').notNull().default(7),
    isPrn: boolean('is_prn').notNull().default(false),
    // Per-day ceiling for an as-needed med (null = no explicit cap; UI falls back to a default).
    prnMaxPerDay: integer('prn_max_per_day'),
    // Active vs paused (a temporary hold the coordinator can toggle).
    isActive: boolean('is_active').notNull().default(true),
    // Permanently stopped. Non-null = discontinued (kept for history, shown collapsed in the UI).
    discontinuedAt: timestamp('discontinued_at', { withTimezone: true }),
    discontinuedNote: text('discontinued_note'),
    ...audit,
  },
  (t) => [
    index('medication_circle_idx').on(t.circleId),
    // Partial index for the hot read: a circle's currently-relevant meds.
    index('medication_active_idx')
      .on(t.circleId)
      .where(sql`${t.deletedAt} is null and ${t.discontinuedAt} is null`),
    check('medication_supply_nonneg', sql`${t.supplyCount} >= 0`),
    check('medication_refill_nonneg', sql`${t.refillThreshold} >= 0`),
  ],
);

// ---- One regimen → many dose times (a weekly recurrence pattern) ----
export const medicationSchedule = pgTable(
  'medication_schedule',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Denormalized circle_id so RLS is a single indexed check (no join to medication needed).
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    medicationId: uuid('medication_id')
      .notNull()
      .references(() => medication.id, { onDelete: 'cascade' }),
    // "HH:mm" 24h, exactly as the <input type="time"> in the schedule builder emits.
    timeOfDay: text('time_of_day').notNull(),
    // JS getDay() indices (0=Sun … 6=Sat) the dose occurs on. Default: every day.
    daysOfWeek: jsonb('days_of_week').$type<number[]>().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    // Optional human dose amount, e.g. "1 tablet", "5ml".
    doseAmount: text('dose_amount'),
    ...audit,
  },
  (t) => [
    index('medication_schedule_med_idx').on(t.medicationId),
    index('medication_schedule_circle_idx').on(t.circleId),
  ],
);

// ---- The high-volume event log: "was this dose taken?" ----
export const medicationAdministration = pgTable(
  'medication_administration',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    medicationId: uuid('medication_id')
      .notNull()
      .references(() => medication.id, { onDelete: 'cascade' }),
    // The schedule occurrence this record resolves (null for an as-needed / PRN use).
    scheduleId: uuid('schedule_id').references(() => medicationSchedule.id, {
      onDelete: 'set null',
    }),
    // The wall-clock moment the dose was due (null for PRN, which has no fixed time).
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    status: doseStatusEnum('status').notNull(),
    // When it was actually given/taken (set for given/taken; null for skipped/refused/missed).
    administeredAt: timestamp('administered_at', { withTimezone: true }),
    administeredByMembershipId: uuid('administered_by_membership_id').references(
      () => membership.id,
      { onDelete: 'set null' },
    ),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Hot read: a circle's doses for a given day.
    index('medication_admin_circle_time_idx').on(t.circleId, t.scheduledFor),
    index('medication_admin_med_idx').on(t.medicationId),
    // One record per scheduled occurrence (idempotent record/undo). PRN rows have a null
    // schedule_id, which a UNIQUE index treats as distinct, so multiple PRN uses are allowed.
    unique('medication_admin_occurrence_uq').on(t.scheduleId, t.scheduledFor),
  ],
);

// ---- Files attached to a medication: pill photos / scans (images) + leaflets / PDFs (documents) ----
// The bytes live in S3 (private bucket) under care-circles/{circleId}/medications/{images|documents}/…;
// this row holds the object key + metadata. Resolve `s3Key` to a short-lived URL with resolveStoredUrl().
export const medicationAttachment = pgTable(
  'medication_attachment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    medicationId: uuid('medication_id')
      .notNull()
      .references(() => medication.id, { onDelete: 'cascade' }),
    kind: medAttachmentKindEnum('kind').notNull(),
    // S3 object key (private bucket). Resolve with resolveStoredUrl() before sending to the client.
    s3Key: text('s3_key').notNull(),
    fileName: text('file_name'),
    contentType: text('content_type'),
    sizeBytes: integer('size_bytes'),
    uploadedByMembershipId: uuid('uploaded_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('medication_attachment_med_idx').on(t.medicationId),
    index('medication_attachment_circle_idx').on(t.circleId),
  ],
);

// ============================================================================
// Documents vault — S3-backed files with a sensitivity tier (CareCircle-Data-Model.md §document).
// Sensitivity is the crux of the document RLS: who can SELECT a row depends on their role.
// Bytes live in S3 (care-circles/{circleId}/documents/…); this row holds the key + metadata.
// ============================================================================
export const documents = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: docCategoryEnum('category').notNull(),
    sensitivity: docSensitivityEnum('sensitivity').notNull().default('standard'),
    kind: docKindEnum('kind').notNull(),
    // S3 object key (private bucket). Resolve with resolveStoredUrl() before sending to the client.
    s3Key: text('s3_key').notNull(),
    contentType: text('content_type'),
    fileName: text('file_name'),
    sizeBytes: integer('size_bytes'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isEmergencyVisible: boolean('is_emergency_visible').notNull().default(false),
    uploadedByMembershipId: uuid('uploaded_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [
    index('document_circle_idx').on(t.circleId),
    index('document_circle_category_idx').on(t.circleId, t.category),
    // Hot read: a circle's live documents by sensitivity (the RLS tier check).
    index('document_circle_sensitivity_idx')
      .on(t.circleId, t.sensitivity)
      .where(sql`${t.deletedAt} is null`),
  ],
);

// ============================================================================
// Tasks — the coordination unit that shares the caregiving load (CareCircle-Data-Model.md §task).
// Assignable to a circle member; completed tasks feed the "fair share" view.
// ============================================================================
export const tasks = pgTable(
  'task',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    details: text('details'),
    category: taskCategoryEnum('category').notNull().default('errand'),
    status: taskStatusEnum('status').notNull().default('open'),
    assignedToMembershipId: uuid('assigned_to_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    // 'none' | 'daily' | 'weekly' | 'custom' (free text so the rule can evolve).
    recurrence: text('recurrence').notNull().default('none'),
    // Manual ordering within a status column (lower = higher up).
    sortOrder: integer('sort_order').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedByMembershipId: uuid('completed_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    createdByMembershipId: uuid('created_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [
    // Hot read: a circle's board, by column then manual order.
    index('task_circle_status_order_idx').on(t.circleId, t.status, t.sortOrder),
    index('task_circle_idx').on(t.circleId),
  ],
);

// ============================================================================
// Appointments — visits to plan, prep, assign, and summarise (CareCircle-Data-Model.md §appointment).
// The "prep questions" checklist + visit summary live on the row (jsonb / text) since they're always
// read with the appointment; assignment + status mirror the rest of the coordination tables.
// ============================================================================
export const appointment = pgTable(
  'appointment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    kind: apptKindEnum('kind').notNull().default('other'),
    provider: text('provider'),
    location: text('location'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    durationMin: integer('duration_min').notNull().default(30),
    assignedToMembershipId: uuid('assigned_to_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    status: apptStatusEnum('status').notNull().default('scheduled'),
    notes: text('notes'),
    // "Questions to ask the doctor" checklist: [{ id, text, done }].
    prep: jsonb('prep').$type<{ id: string; text: string; done: boolean }[]>().notNull().default([]),
    visitSummary: text('visit_summary'),
    postedToTimeline: boolean('posted_to_timeline').notNull().default(false),
    createdByMembershipId: uuid('created_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [
    // Hot read: a circle's calendar/list, by time.
    index('appointment_circle_start_idx').on(t.circleId, t.startsAt),
  ],
);

// ============================================================================
// Observations — recorded vitals (CareCircle-Data-Model.md §observation). One row per reading;
// blood pressure stores systolic in `value` and diastolic in `secondary`.
// ============================================================================
export const observation = pgTable(
  'observation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    metric: observationMetricEnum('metric').notNull(),
    value: doublePrecision('value').notNull(),
    // Diastolic for blood pressure; null for single-value metrics.
    secondary: doublePrecision('secondary'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    note: text('note'),
    recordedByMembershipId: uuid('recorded_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [
    // Hot read: a circle's series for a metric over time.
    index('observation_circle_metric_time_idx').on(t.circleId, t.metric, t.recordedAt),
  ],
);

// ============================================================================
// Health alert settings — the per-circle safe ranges edited in Health → Alerts. One row per
// (circle, metric); metrics without a row fall back to the shared defaults
// (src/components/health/data.ts DEFAULT_THRESHOLDS). `logObservation` evaluates every new
// reading against these and raises an urgent timeline event when out of range.
// ============================================================================
export const healthAlertSetting = pgTable(
  'health_alert_setting',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    metric: observationMetricEnum('metric').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    // Below `min` → low; above `max` → elevated (mood alerts only on `min`).
    min: doublePrecision('min').notNull(),
    max: doublePrecision('max').notNull(),
    // Diastolic bounds (blood pressure only).
    diaMin: doublePrecision('dia_min'),
    diaMax: doublePrecision('dia_max'),
    updatedByMembershipId: uuid('updated_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [unique('health_alert_setting_circle_metric_uq').on(t.circleId, t.metric)],
);

// ---- Emergency-card share links: tokenized public access for first responders ----
/**
 * A revocable, expiring capability link to the circle's Emergency Card, for EMS/ER staff who have
 * no account. Like `invitation.token`, the high-entropy URL-safe token IS the authorization: the
 * public `/e/<token>` page resolves it via the privileged connection (an anonymous visitor can't
 * pass any RLS policy, by design), checks expiry + revocation, and every view bumps `view_count`
 * AND writes a `read` row to the append-only audit log so the family always knows the card was
 * opened. Members see/manage these rows under RLS; only coordinators create/revoke (0041 policy).
 */
export const emergencyCardShare = pgTable(
  'emergency_card_share',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    createdByMembershipId: uuid('created_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('emergency_card_share_circle_idx').on(t.circleId)],
);

// ============================================================================
// Care rota — recurring weekly shifts (who's on, in person vs on call). The data-model's
// deferred `care_shift`: a lightweight weekly pattern keyed by day-of-week + HH:mm times.
// ============================================================================
export const careShift = pgTable(
  'care_shift',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    assignedToMembershipId: uuid('assigned_to_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    // 0 = Sunday … 6 = Saturday (matches JS Date.getDay()).
    dayIndex: integer('day_index').notNull(),
    // "HH:mm" 24h local. If endTime <= startTime, the shift runs overnight into the next day.
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    shiftType: shiftTypeEnum('shift_type').notNull().default('in-person'),
    createdByMembershipId: uuid('created_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [index('care_shift_circle_day_idx').on(t.circleId, t.dayIndex)],
);

// ============================================================================
// Timeline interactions — comments + reactions on timeline_event rows.
// timeline_event (above) is the activity-stream spine; these two tables let the
// care circle converse and acknowledge on each update (CareCircle-Data-Model.md
// §timeline / §comment). Both are tenant-scoped (circle_id) for a single RLS check.
// ============================================================================

// ---- A threaded comment on a timeline event ----
export const timelineComment = pgTable(
  'timeline_comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    timelineEventId: uuid('timeline_event_id')
      .notNull()
      .references(() => timelineEvent.id, { onDelete: 'cascade' }),
    authorMembershipId: uuid('author_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    ...audit,
  },
  (t) => [
    index('timeline_comment_event_idx').on(t.timelineEventId),
    index('timeline_comment_circle_idx').on(t.circleId),
  ],
);

// ---- A reaction (a "heart") on a timeline event ----
export const timelineReaction = pgTable(
  'timeline_reaction',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    timelineEventId: uuid('timeline_event_id')
      .notNull()
      .references(() => timelineEvent.id, { onDelete: 'cascade' }),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => membership.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // One reaction per member per event (toggle on/off); the UI only has a heart.
    unique('timeline_reaction_event_member_uq').on(t.timelineEventId, t.membershipId),
    index('timeline_reaction_event_idx').on(t.timelineEventId),
  ],
);

// ============================================================================
// RAG chunks — the vector store for "Ask CareCircle", kept INSIDE Aurora via pgvector.
// One row = one embedded text chunk of a source record (document / timeline / audit). Because
// these rows are tenant-scoped (circle_id) and sensitivity-tagged, the SAME Row-Level Security
// that guards documents guards retrieval — a similarity query can only ever return chunks the
// caller is allowed to read. Embeddings are produced by Amazon Bedrock Titan (1024-d).
// ============================================================================
export const ragSourceEnum = pgEnum('rag_source', ['document', 'timeline', 'audit']);

/** Embedding dimension — must match the Bedrock Titan output + the migration's vector(N). */
export const RAG_EMBEDDING_DIM = 1024;

export const ragChunk = pgTable(
  'rag_chunk',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    source: ragSourceEnum('source').notNull(),
    // The id of the originating record (document.id / timeline_event.id / audit_log.id).
    sourceId: uuid('source_id').notNull(),
    // Mirrors the documents sensitivity tiers; the RLS SELECT policy gates by this + role.
    sensitivity: docSensitivityEnum('sensitivity').notNull().default('standard'),
    // Provenance for the UI source card.
    title: text('title').notNull(),
    detail: text('detail').notNull().default(''),
    href: text('href').notNull().default(''),
    chunkIndex: integer('chunk_index').notNull(),
    chunkCount: integer('chunk_count').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: RAG_EMBEDDING_DIM }).notNull(),
    // When the underlying record was created (for the "time" shown on a source card).
    sourceCreatedAt: timestamp('source_created_at', { withTimezone: true }).notNull(),
    ...audit,
  },
  (t) => [
    // Re-ingest overwrites in place: one row per (source, sourceId, chunkIndex).
    unique('rag_chunk_source_uq').on(t.source, t.sourceId, t.chunkIndex),
    index('rag_chunk_circle_idx').on(t.circleId),
    index('rag_chunk_circle_source_idx').on(t.circleId, t.source, t.sourceId),
    // Approximate-nearest-neighbour index for cosine similarity search.
    index('rag_chunk_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
);

// ============================================================================
// Ask CareCircle — saved conversations. A conversation is PRIVATE to the user who started it
// (RLS: circle ∈ caller's circles AND user_id = current_app_user_id()), so each caregiver keeps
// their own chat history with the assistant; messages persist so a refresh restores the thread.
// ============================================================================
export const askRoleEnum = pgEnum('ask_role', ['user', 'assistant']);

export const askConversation = pgTable(
  'ask_conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    // The owner. Conversations are per-user, not shared across the circle.
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    ...audit,
  },
  (t) => [
    // Hot read: a user's conversations in a circle, newest first.
    index('ask_conversation_circle_user_idx').on(t.circleId, t.userId, t.updatedAt),
  ],
);

export const askMessage = pgTable(
  'ask_message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => askConversation.id, { onDelete: 'cascade' }),
    // Denormalised for a single-predicate RLS check (no join needed in the policy).
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: askRoleEnum('role').notNull(),
    content: text('content').notNull(),
    // For assistant turns: the SourceRef[] cited (label/type/href/…), rendered as source cards.
    sources: jsonb('sources'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('ask_message_conversation_idx').on(t.conversationId, t.createdAt)],
);

// ============================================================================
// Daily Digest — a warm, AI-written end-of-day summary for the circle, persisted per day so it's
// stable (everyone sees the same digest), navigable by date, and cheap to re-open. The narrative is
// generated by Claude on Bedrock from the day's real events; the stats + source moments are computed
// deterministically from the data (so the numbers are always accurate). Feedback is per-user.
// ============================================================================
export const digestMoodEnum = pgEnum('digest_mood', ['great', 'good', 'okay', 'low']);
// NB: enum type name must NOT clash with the `digest_feedback` TABLE below — a table implicitly
// creates a type of its own name, so the enum is `digest_feedback_value`.
export const digestFeedbackEnum = pgEnum('digest_feedback_value', ['up', 'down']);

export const dailyDigest = pgTable(
  'daily_digest',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    // The calendar day the digest covers (circle-local), e.g. 2026-06-08.
    digestDate: date('digest_date').notNull(),
    headline: text('headline').notNull(),
    emoji: text('emoji').notNull(),
    mood: digestMoodEnum('mood').notNull(),
    paragraphs: jsonb('paragraphs').notNull(), // string[]
    stats: jsonb('stats').notNull(), // DigestStat[]
    sources: jsonb('sources').notNull(), // SourceMoment[]
    // Which model wrote it (provenance), and who triggered the generation.
    model: text('model'),
    generatedByMembershipId: uuid('generated_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    // Cached model translations of the narrative, keyed by language code ('tl', 'es', …). Filled
    // lazily the first time a member needs that language (digest screen or email), then reused —
    // one Claude call per language per day, not per member.
    translations: jsonb('translations').$type<Record<string, { headline: string; paragraphs: string[] }>>(),
    ...audit,
  },
  (t) => [
    // One digest per circle per day (re-generate updates in place).
    unique('daily_digest_circle_date_uq').on(t.circleId, t.digestDate),
    index('daily_digest_circle_date_idx').on(t.circleId, t.digestDate),
  ],
);

// ---- Per-user "was this digest helpful?" (private to the rater) ----
export const digestFeedback = pgTable(
  'digest_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    digestId: uuid('digest_id')
      .notNull()
      .references(() => dailyDigest.id, { onDelete: 'cascade' }),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: digestFeedbackEnum('value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('digest_feedback_digest_user_uq').on(t.digestId, t.userId)],
);

// ============================================================================
// Incidents — "report an incident" (falls, hospitalizations, emergencies). One incident row, plus
// a per-notified-member acknowledgement row and a coordinating comment thread. Reporting also emits
// an `incident` timeline_event (urgent for high severity) so the feed + dashboard surface it.
// (CareCircle-Data-Model.md §incident.)
// ============================================================================
export const incident = pgTable(
  'incident',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    type: incidentTypeEnum('type').notNull(),
    severity: incidentSeverityEnum('severity').notNull().default('low'),
    description: text('description').notNull(),
    // When the incident actually happened (the reporter can backdate it).
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    status: incidentStatusEnum('status').notNull().default('open'),
    // Optional photo: S3 object key (private bucket). Resolve with resolveStoredUrl().
    photoS3Key: text('photo_s3_key'),
    reportedByMembershipId: uuid('reported_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    // The timeline event emitted on report (so the detail view can deep-link to the feed).
    timelineEventId: uuid('timeline_event_id').references(() => timelineEvent.id, {
      onDelete: 'set null',
    }),
    resolutionNote: text('resolution_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByMembershipId: uuid('resolved_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [
    // Hot read: a circle's incidents, newest first.
    index('incident_circle_time_idx').on(t.circleId, t.occurredAt),
    index('incident_circle_status_idx').on(t.circleId, t.status),
  ],
);

// ---- Who was notified of an incident, and whether they've seen / acknowledged it ----
export const incidentNotification = pgTable(
  'incident_notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    incidentId: uuid('incident_id')
      .notNull()
      .references(() => incident.id, { onDelete: 'cascade' }),
    membershipId: uuid('membership_id')
      .notNull()
      .references(() => membership.id, { onDelete: 'cascade' }),
    status: incidentAckEnum('status').notNull().default('pending'),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // One notification per member per incident (the ack toggles its status).
    unique('incident_notification_incident_member_uq').on(t.incidentId, t.membershipId),
    index('incident_notification_incident_idx').on(t.incidentId),
  ],
);

// ---- A coordinating comment on an incident ----
export const incidentComment = pgTable(
  'incident_comment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    incidentId: uuid('incident_id')
      .notNull()
      .references(() => incident.id, { onDelete: 'cascade' }),
    authorMembershipId: uuid('author_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    ...audit,
  },
  (t) => [
    index('incident_comment_incident_idx').on(t.incidentId),
    index('incident_comment_circle_idx').on(t.circleId),
  ],
);

// ============================================================================
// Billing (preview) — a circle's payment methods + invoices, managed by coordinators.
// IMPORTANT (PCI): we NEVER store a full card number or CVV. A `payment_method` row holds only the
// display metadata a tokenizing processor would hand back (brand + last 4 + expiry) — exactly what
// the UI shows. Invoices are issued by a billing engine (not built yet), so the table starts empty
// and the UI renders a "no invoices" state until one exists.
// ============================================================================
export const paymentMethod = pgTable(
  'payment_method',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    // Card network, e.g. "visa", "mastercard", "amex", "discover", or "card" when unknown.
    brand: text('brand').notNull(),
    // Last four digits only — safe to store + display.
    last4: text('last4').notNull(),
    expMonth: integer('exp_month').notNull(),
    expYear: integer('exp_year').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    addedByMembershipId: uuid('added_by_membership_id').references(() => membership.id, {
      onDelete: 'set null',
    }),
    ...audit,
  },
  (t) => [index('payment_method_circle_idx').on(t.circleId)],
);

export const invoice = pgTable(
  'invoice',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    circleId: uuid('circle_id')
      .notNull()
      .references(() => careCircle.id, { onDelete: 'cascade' }),
    // Human invoice number, e.g. "INV-2026-006".
    number: text('number').notNull(),
    amountCents: integer('amount_cents').notNull().default(0),
    currency: text('currency').notNull().default('usd'),
    // "paid" | "open" | "void".
    status: text('status').notNull().default('open'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    // A presigned/external link to the invoice PDF, when one exists.
    pdfUrl: text('pdf_url'),
    ...audit,
  },
  (t) => [index('invoice_circle_time_idx').on(t.circleId, t.issuedAt)],
);

// ---- Platform service-status monitoring & alerting (staff-facing; NO tenant data) ----
// Like `platform_auth_audit`, these tables belong to the platform layer: written and read through
// the privileged admin connection only. The RLS migration enables row security with NO policies,
// so the least-privilege app role can never read alert recipients or rewrite the status board —
// the lone exception is the user-facing outage banner, which reads `service_status` via the
// privileged client behind a fail-quiet helper (src/lib/status/outages.ts).

/**
 * Last known status of each monitored platform service (one row per service, keyed by the
 * display name used on /admin/system). `since` marks when the CURRENT status began — the
 * transition detector (src/lib/admin/status-alerts.ts) compares fresh probes against these rows
 * and emails the alert recipients only on a change, never on every check.
 */
export const serviceStatus = pgTable('service_status', {
  name: text('name').primaryKey(),
  // "operational" | "degraded" | "down" (mirrors ServiceStatus in lib/admin/system-types).
  status: text('status').notNull(),
  metric: text('metric').notNull().default(''),
  since: timestamp('since', { withTimezone: true }).defaultNow().notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Who gets the "service down / recovered" alert emails. Managed by platform admins on
 * /admin/system; seeded with the primary admin address by the migration. `active` lets a
 * recipient be paused without losing them. Hard-deleted on remove (no tenant data to retain).
 */
export const statusAlertRecipient = pgTable(
  'status_alert_recipient',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  // One row per address regardless of casing — same rule as the user table.
  (t) => [uniqueIndex('status_alert_recipient_email_uq').on(sql`lower(${t.email})`)],
);
