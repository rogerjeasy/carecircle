// Shared domain types for the People screen.

/** The 7 circle roles (independent of the app-shell nav enum; "family-admin" is people-specific). */
export type CircleRole =
  | "coordinator"
  | "family-admin"
  | "family"
  | "caregiver"
  | "readonly"
  | "care-recipient"
  | "clinician";

export type MemberStatus = "active" | "invited" | "suspended";

/** Access level a role has to a capability. */
export type Access = "edit" | "view" | "none";

/** A capability row in the permissions matrix. */
export type CapabilityKey =
  | "timeline"
  | "meds"
  | "appts"
  | "tasks"
  | "health"
  | "docsMedical"
  | "docsFinancial"
  | "people"
  | "billing";

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  /** Free-text relationship, e.g. "Daughter", "Home aide". */
  relationship: string;
  role: CircleRole;
  status: MemberStatus;
  /** Resolved last-active time (built from the seed offset). */
  lastActive: Date | null;
}

export interface Invite {
  id: string;
  email: string;
  role: CircleRole;
  sentAt: Date;
}

export interface MemberSeed extends Omit<Member, "lastActive"> {
  /** Hours since last active, or null (e.g. invited / never). */
  lastActiveHoursAgo: number | null;
}

export interface InviteSeed extends Omit<Invite, "sentAt"> {
  sentDaysAgo: number;
}
