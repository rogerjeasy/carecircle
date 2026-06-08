import 'server-only';

/**
 * Server-side authorization for the Health feature — enforced by the log action and mirrored by the
 * DB RLS policies (drizzle/0021_observations_rls.sql). Checks the user's REAL membership role in the
 * active circle, never a client claim.
 *
 * Logging a reading is open to everyone EXCEPT a read-only relative (matches the UI's
 * canLogReadings = role !== 'readonly').
 */
export function canLogReadings(dbRole: string | null | undefined): boolean {
  return !!dbRole && dbRole !== 'read_only';
}
