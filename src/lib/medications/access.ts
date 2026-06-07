import 'server-only';

/**
 * Server-side authorization for the Medications feature — the single source of truth the
 * server actions enforce, mirroring the project role matrix (CareCircle-Data-Model.md
 * §authorization) and the DB RLS policies in drizzle/0009_medications_rls.sql.
 *
 * These check the user's REAL membership role in the active circle (resolved under RLS),
 * never the client's claimed role. The UI's own `canManageMeds`/`canRecordDoses`
 * (src/components/medications/utils.ts) only decide what to render; this decides what is allowed.
 */

/** Roles that may add / edit / pause / discontinue medications. */
export const MED_MANAGE_ROLES = ['owner', 'family_admin'] as const;

/** Roles that may record a dose / log a PRN (care recipient may record their own). */
export const MED_RECORD_ROLES = [
  'owner',
  'family_admin',
  'family',
  'caregiver',
  'care_recipient',
] as const;

/** True if the DB role may manage the medication list. */
export function canManageMeds(dbRole: string | null | undefined): boolean {
  return !!dbRole && (MED_MANAGE_ROLES as readonly string[]).includes(dbRole);
}

/** True if the DB role may record doses / PRN uses. */
export function canRecordDoses(dbRole: string | null | undefined): boolean {
  return !!dbRole && (MED_RECORD_ROLES as readonly string[]).includes(dbRole);
}
