import 'server-only';

/**
 * Server-side authorization for the Appointments feature — enforced by the server actions and
 * mirrored by the DB RLS policies (drizzle/0019_appointments_rls.sql). Checks the user's REAL
 * membership role in the active circle, never a client claim.
 *
 * Managing appointments (schedule / edit / assign / prep / summary / cancel) is open to the active
 * caregiving roles; the same set is offered as assignable "who's taking them" members.
 */
export const APPT_MANAGE_ROLES = ['owner', 'family_admin', 'family', 'caregiver'] as const;

export function canManageAppointments(dbRole: string | null | undefined): boolean {
  return !!dbRole && (APPT_MANAGE_ROLES as readonly string[]).includes(dbRole);
}
