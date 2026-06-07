import 'server-only';

/**
 * Server-side authorization for the Timeline feature — enforced by the server actions and mirrored
 * by the DB RLS policies (drizzle/0011_timeline_rls.sql). Checks the user's REAL membership role in
 * the active circle, never a client claim.
 *
 * Posting a note, commenting, and reacting are allowed for everyone EXCEPT a read-only relative
 * (who is "following along, nothing to manage"). Private visibility is additionally limited to
 * coordinators/family by `canPostPrivate` in the UI, and the timeline_event RLS hides others'
 * private events regardless.
 */
export const TIMELINE_CONTRIBUTOR_ROLES = [
  'owner',
  'family_admin',
  'family',
  'caregiver',
  'care_recipient',
  'clinician',
] as const;

/** Roles allowed to set a note's visibility to "private" (coordinators + family). */
export const TIMELINE_PRIVATE_ROLES = ['owner', 'family_admin', 'family'] as const;

export function canContribute(dbRole: string | null | undefined): boolean {
  return !!dbRole && (TIMELINE_CONTRIBUTOR_ROLES as readonly string[]).includes(dbRole);
}

export function canPostPrivate(dbRole: string | null | undefined): boolean {
  return !!dbRole && (TIMELINE_PRIVATE_ROLES as readonly string[]).includes(dbRole);
}
