import 'server-only';

/**
 * Server-side authorization for the Daily Digest, mirrored by the DB RLS (drizzle/0030).
 * Any active member may READ the digest; generating/re-generating it (which reads the day's record)
 * is open to everyone except a read-only relative — matching the `daily_digest` manage policy.
 */
export function canGenerateDigest(dbRole: string | null | undefined): boolean {
  return !!dbRole && dbRole !== 'read_only';
}
