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
  index,
  unique,
} from 'drizzle-orm/pg-core';
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
