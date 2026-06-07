// Shared domain types for the Incidents feature.

export type IncidentType = "fall" | "hospitalization" | "emergency" | "other";

export type Severity = "low" | "medium" | "high";

export type AckStatus = "acknowledged" | "seen" | "pending";

export type IncidentStatus = "open" | "resolved";

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: string;
  /** Role label, e.g. "Coordinator", "Caregiver". */
  roleLabel: string;
}

export interface Notification {
  memberId: string;
  status: AckStatus;
  /** When they saw / acknowledged it. */
  at?: Date;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  at: Date;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  description: string;
  at: Date;
  reporterId: string;
  photoUrl?: string;
  status: IncidentStatus;
  notifications: Notification[];
  comments: Comment[];
  resolutionNote?: string;
  resolvedAt?: Date;
  resolvedById?: string;
}
