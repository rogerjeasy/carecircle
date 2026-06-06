/**
 * Mapping between the DB `role` enum (src/db/schema/app.ts) and the app-shell's UI role
 * vocabulary + human labels. Shared so every circle-scoped reader maps roles identically.
 */
import type { UserRole } from '@/components/app-shell/app-shell-context';

const DB_ROLE_TO_UI: Record<string, UserRole> = {
  owner: 'coordinator',
  family_admin: 'coordinator',
  family: 'family',
  caregiver: 'caregiver',
  read_only: 'readonly',
  care_recipient: 'care-recipient',
  clinician: 'clinician',
};

const UI_ROLE_LABEL: Record<UserRole, string> = {
  coordinator: 'Coordinator',
  family: 'Family',
  caregiver: 'Caregiver',
  readonly: 'Read-only',
  'care-recipient': 'Care recipient',
  clinician: 'Clinician',
};

/** DB role enum → UI role (defaults to coordinator for anything unexpected). */
export function dbRoleToUiRole(role: string): UserRole {
  return DB_ROLE_TO_UI[role] ?? 'coordinator';
}

/** UI role → display label. */
export function uiRoleLabel(role: UserRole): string {
  return UI_ROLE_LABEL[role];
}

/** DB role enum → display label (e.g. "owner" → "Coordinator"). */
export function dbRoleLabel(role: string): string {
  return uiRoleLabel(dbRoleToUiRole(role));
}
