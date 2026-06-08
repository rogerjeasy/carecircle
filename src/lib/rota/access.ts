import 'server-only';

/**
 * Server-side authorization for the Care Rota feature — enforced by the actions and mirrored by the
 * DB RLS policies (drizzle/0023_care_shifts_rls.sql). Checks the user's REAL membership role.
 *
 * Editing the rota (add/remove shifts) is open to coordinators + family (owner, family_admin, family).
 */
export const ROTA_MANAGE_ROLES = ['owner', 'family_admin', 'family'] as const;

export function canManageRota(dbRole: string | null | undefined): boolean {
  return !!dbRole && (ROTA_MANAGE_ROLES as readonly string[]).includes(dbRole);
}
