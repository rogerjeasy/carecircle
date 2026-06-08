import 'server-only';

/**
 * Server-side authorization for the Tasks feature — enforced by the server actions and mirrored by
 * the DB RLS policies (drizzle/0017_tasks_rls.sql). Checks the user's REAL membership role in the
 * active circle, never a client claim.
 *
 * Managing tasks (create / edit / move / complete / delete) is open to the active caregiving roles.
 * The same set is offered as assignable members (the people who share the caregiving load).
 */
export const TASK_MANAGE_ROLES = ['owner', 'family_admin', 'family', 'caregiver'] as const;

export function canManageTasks(dbRole: string | null | undefined): boolean {
  return !!dbRole && (TASK_MANAGE_ROLES as readonly string[]).includes(dbRole);
}
