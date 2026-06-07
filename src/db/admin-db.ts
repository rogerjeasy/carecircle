/**
 * Privileged cross-tenant database access — PLATFORM ADMIN ONLY.
 *
 * The running app normally connects as the least-privilege `carecircle_app` role, which is
 * subject to Row-Level Security (see ./index.ts, ./rls.ts). That role can only ever see rows in
 * circles the signed-in user belongs to — perfect for tenants, useless for the staff console,
 * because a platform admin belongs to NO circle and so would see nothing.
 *
 * The `/admin` console deliberately needs to read ACROSS all circles. The only way to do that is
 * to connect as the owner/admin role, which BYPASSES RLS. That is exactly the connection in
 * `MIGRATION_DATABASE_URL` (used by migrations + the seed). This module wraps it.
 *
 * 🔒 Non-negotiable rules (see AGENTS.md → "Platform super-admin"):
 *   1. This module is `server-only` and the privileged client is never exported raw.
 *   2. Every caller MUST be gated by `requirePlatformAdmin()` first (defense-in-depth: the route
 *      handler/page checks it too — never rely on this module being the only guard).
 *   3. Every cross-tenant read that exposes tenant data is logged via `logPlatformAccess()` so we
 *      always know WHO viewed WHAT, WHEN. "Never expose tenant data without logging who viewed it."
 */
import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { after } from 'next/server';
import * as schema from './schema';
import { maskEmail } from '@/lib/log';

/** Identifies the staff member performing a privileged cross-tenant read, for the access log. */
export type PlatformActor = { id: string; email?: string | null };

const adminUrl = process.env.MIGRATION_DATABASE_URL;

// Lazy singletons: one privileged client per server instance, created only on first admin use.
let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * The RLS-BYPASSING Drizzle client for cross-tenant admin reads. Throws if the admin connection
 * isn't configured (e.g. a deployment that only ships the app role) so callers can surface a clear
 * "console unavailable" state instead of silently leaking or crashing mid-query.
 */
export function getPlatformDb() {
  if (!adminUrl) {
    throw new Error(
      'Platform admin console unavailable: MIGRATION_DATABASE_URL (the cross-tenant connection) is not set.',
    );
  }
  if (!_db) {
    // `prepare: false` for poolers/serverless; tiny pool — admin reads are low-volume.
    _client = postgres(adminUrl, { prepare: false, max: 2 });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

/** Whether the cross-tenant connection is configured at all (used to render an honest status). */
export function isPlatformDbConfigured(): boolean {
  return Boolean(adminUrl);
}

/**
 * The raw postgres.js client behind the privileged Drizzle instance — needed for LISTEN/NOTIFY
 * (Drizzle has no streaming-notification API). Used by the live hub to hold ONE shared `LISTEN`
 * connection that fans incident events out to every connected admin. Throws if unconfigured.
 */
export function getPlatformClient() {
  // Ensure the lazy singletons are initialised, then hand back the raw client.
  getPlatformDb();
  return _client!;
}

/**
 * Record that a platform admin viewed cross-tenant data. We log a single sanitized line per access
 * (who / what / scope) rather than spamming the per-circle `audit_log` — that table is keyed to a
 * single `circle_id`, but these reads span every circle. A durable, queryable `platform_audit`
 * table is the production follow-up; this guarantees the access is never silent in the meantime.
 *
 * Logging hygiene (AGENTS.md): the actor's opaque user id + a MASKED email domain only — never
 * the raw email address, row contents, query text, or any other PII.
 *
 * The line is emitted via `after()` so it runs AFTER React's render lifecycle. Most admin reads
 * happen during a Server Component render (e.g. the /admin/audit page), and in dev Next replays
 * console output made *during* render into the BROWSER console (the "Server"-badged lines). Logging
 * after the response keeps this server-only audit trail in the terminal without leaking it client-
 * side. Outside a request scope (e.g. the live-hub streaming loop) `after()` throws, so we fall back
 * to a direct write — that path is never an RSC render, so it was never replayed to the browser.
 */
export function logPlatformAccess(
  actor: PlatformActor,
  resource: string,
  meta?: Record<string, string | number>,
) {
  const detail = meta
    ? ' ' +
      Object.entries(meta)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';
  const line = `[platform-admin] cross-tenant read actor=${actor.id} email=${maskEmail(actor.email)} resource=${resource}${detail}`;
  try {
    after(() => console.info(line));
  } catch {
    // Not in a request scope (e.g. a streaming subscription tick) — log immediately.
    console.info(line);
  }
}
