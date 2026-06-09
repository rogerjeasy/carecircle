import 'server-only';

/**
 * Server-side authorization for the Incidents feature — enforced by the server actions and mirrored
 * by the DB RLS policies (drizzle/0033_incidents_rls.sql). Checks the user's REAL membership role in
 * the active circle, never a client claim.
 *
 *  - Reporting an incident, acknowledging, and commenting are open to everyone who actively
 *    participates in care — everyone EXCEPT a read-only relative ("following along, nothing to do").
 *  - Resolving an incident is limited to coordinators + family (owner, family_admin, family),
 *    matching the UI's canResolveIncidents.
 */
export const INCIDENT_REPORT_ROLES = [
  'owner',
  'family_admin',
  'family',
  'caregiver',
  'care_recipient',
  'clinician',
] as const;

export const INCIDENT_RESOLVE_ROLES = ['owner', 'family_admin', 'family'] as const;

export function canReportIncidents(dbRole: string | null | undefined): boolean {
  return !!dbRole && (INCIDENT_REPORT_ROLES as readonly string[]).includes(dbRole);
}

export function canResolveIncidents(dbRole: string | null | undefined): boolean {
  return !!dbRole && (INCIDENT_RESOLVE_ROLES as readonly string[]).includes(dbRole);
}
