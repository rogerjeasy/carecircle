import 'server-only';

import type { CircleRole } from '@/components/people/types';

/**
 * Server-side authorization + role mapping for the People feature. Managing people (roles, invites,
 * suspend/remove) is limited to owners and family admins — matching the membership/invitation RLS
 * policies (drizzle/0001 + 0005). Checks the user's REAL membership role, never a client claim.
 */
export function canManagePeople(dbRole: string | null | undefined): boolean {
  return dbRole === 'owner' || dbRole === 'family_admin';
}

/** DB role enum → the People screen's CircleRole vocabulary. */
const DB_TO_CIRCLE: Record<string, CircleRole> = {
  owner: 'coordinator',
  family_admin: 'family-admin',
  family: 'family',
  caregiver: 'caregiver',
  read_only: 'readonly',
  care_recipient: 'care-recipient',
  clinician: 'clinician',
};

/** People CircleRole → DB role enum. */
const CIRCLE_TO_DB: Record<CircleRole, string> = {
  coordinator: 'owner',
  'family-admin': 'family_admin',
  family: 'family',
  caregiver: 'caregiver',
  readonly: 'read_only',
  'care-recipient': 'care_recipient',
  clinician: 'clinician',
};

export function dbRoleToCircleRole(role: string): CircleRole {
  return DB_TO_CIRCLE[role] ?? 'family';
}

export function circleRoleToDbRole(role: CircleRole): string {
  return CIRCLE_TO_DB[role] ?? 'family';
}
