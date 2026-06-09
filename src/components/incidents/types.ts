// Shared domain types for the Incidents feature.
//
// The list/detail shapes carry server-resolved display fields (member names, colours, the current
// user's ack, the resolved photo URL) so the client components render without any member lookup.

export type IncidentType = "fall" | "hospitalization" | "emergency" | "other";

export type Severity = "low" | "medium" | "high";

export type AckStatus = "acknowledged" | "seen" | "pending";

export type IncidentStatus = "open" | "resolved";

/** A circle member — used by the report flow's "who to notify" picker. */
export interface Member {
  id: string; // membership id
  name: string;
  initials: string;
  color: string;
  /** Role label, e.g. "Coordinator", "Caregiver". */
  roleLabel: string;
  /** Whether this member opts into escalation notifications (default-selected in the picker). */
  notifyEscalations?: boolean;
}

/** A notified member's acknowledgement state, with display fields resolved. */
export interface IncidentNotification {
  membershipId: string;
  name: string;
  initials: string;
  color: string;
  roleLabel: string;
  status: AckStatus;
  /** When they acknowledged (if they have). */
  at?: Date;
}

/** A coordinating comment, with author display fields resolved. */
export interface IncidentComment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  at: Date;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  description: string;
  /** When the incident occurred. */
  at: Date;
  status: IncidentStatus;
  /** First name of the reporter (or "Someone"). */
  reporterName: string;
  /** Resolved (presigned) photo URL, or null/undefined when there's none. */
  photoUrl?: string | null;
  notifications: IncidentNotification[];
  comments: IncidentComment[];
  resolutionNote?: string;
  resolvedAt?: Date;
  resolvedByName?: string;
  /** The current user's ack status for this incident (undefined if they weren't notified). */
  myAck?: AckStatus;
  /** The timeline event emitted when this was reported (deep-link target). */
  timelineEventId?: string | null;
}

/** Primary emergency contact surfaced for high-severity incidents. */
export interface EmergencyContact {
  name: string;
  phone: string;
}

/** Everything the report flow needs (fetched when the flow opens). */
export interface IncidentReportContext {
  circleId: string;
  members: Member[];
  defaultNotifyIds: string[];
  recipientName: string | null;
  emergencyContact: EmergencyContact | null;
}

/** Everything the Incidents list screen needs, assembled server-side. */
export interface IncidentsData {
  /** The active circle these incidents belong to — used to remount the screen on circle switch. */
  circleId: string;
  incidents: Incident[];
  recipientName: string | null;
}

/** Everything the incident detail view needs, assembled server-side. */
export interface IncidentDetailData {
  circleId: string;
  incident: Incident;
  emergencyContact: EmergencyContact | null;
}
