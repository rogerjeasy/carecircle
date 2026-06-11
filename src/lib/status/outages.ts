/**
 * Current service outages for the user-facing banner (see app-shell/service-status-banner.tsx).
 *
 * Reads the `service_status` snapshot that the status checker maintains (lib/admin/status-alerts).
 * The table is platform-level and RLS-locked away from the app role, so the read goes through the
 * privileged connection — but it exposes ONLY service display names (no tenant data, no emails),
 * is cached for 30s per server instance (one cheap query, not one per page view), and degrades to
 * an empty list on any failure: a broken status board must never break the app it reports on.
 *
 * Rows older than 30 minutes are ignored — if the checker itself stops running, a stale "down"
 * must not permanently alarm users.
 */
import 'server-only';
import { and, eq, gte } from 'drizzle-orm';
import { getPlatformDb, isPlatformDbConfigured } from '@/db/admin-db';
import { serviceStatus } from '@/db/schema';

const CACHE_TTL_MS = 30_000;
const MAX_STALENESS_MS = 30 * 60_000;

let cache: { at: number; names: string[] } | null = null;

/** Display names of services currently down (freshly checked), or [] when all is well/unknown. */
export async function getActiveOutages(): Promise<string[]> {
  if (!isPlatformDbConfigured()) return [];
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.names;
  try {
    const freshSince = new Date(Date.now() - MAX_STALENESS_MS);
    const rows = await getPlatformDb()
      .select({ name: serviceStatus.name })
      .from(serviceStatus)
      .where(and(eq(serviceStatus.status, 'down'), gte(serviceStatus.checkedAt, freshSince)))
      .orderBy(serviceStatus.name);
    cache = { at: Date.now(), names: rows.map((r) => r.name) };
    return cache.names;
  } catch (err) {
    // e.g. migrations not applied yet, or the DB itself is the outage — stay quiet, log the name.
    console.error('[status] outage read failed:', (err as Error)?.name ?? 'error');
    return cache?.names ?? [];
  }
}
