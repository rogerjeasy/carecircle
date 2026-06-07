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
  index,
  unique,
  check,
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
    notifyEscalations: boolean('notify_escalations').notNull().default(true),
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
