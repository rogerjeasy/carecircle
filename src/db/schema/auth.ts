/**
 * Auth.js (NextAuth v5) tables for the Drizzle adapter.
 * These hold identity only — NO Row-Level Security is applied here, because the
 * Auth.js adapter manages them directly. Domain tables (see app.ts) reference user.id.
 */
import { pgTable, text, timestamp, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'user',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    email: text('email').notNull(),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    image: text('image'),
    // Set only for email/password (Credentials) accounts. OAuth-only users leave this null
    // and can sign in solely through their provider. Hash format: see src/lib/password.ts.
    passwordHash: text('password_hash'),
    // Account preferences (Settings → Account). Nullable; the UI falls back to sensible defaults.
    language: text('language'),
    timezone: text('timezone'),
  },
  // Case-insensitive uniqueness: one identity per email regardless of casing, so the
  // Credentials provider and the OAuth adapter can't create duplicate accounts.
  (t) => [uniqueIndex('user_email_unique').on(sql`lower(${t.email})`)],
);

/**
 * Password-reset tokens. We store only a SHA-256 hash of the opaque token (never the token
 * itself), so a database leak can't be used to reset anyone's password. Single-use
 * (`usedAt`) and short-lived (`expiresAt`, 1 hour). Identity-only table — no RLS.
 */
export const passwordResetTokens = pgTable(
  'password_reset_token',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('password_reset_token_user_idx').on(t.userId)],
);

export const accounts = pgTable(
  'account',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })],
);

export const sessions = pgTable('session', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_token',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (v) => [primaryKey({ columns: [v.identifier, v.token] })],
);
