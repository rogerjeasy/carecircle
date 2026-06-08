// Shared domain types for the Appointments screen.

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "needs-prep"
  | "completed"
  | "cancelled";

export type AppointmentKind =
  | "checkup"
  | "specialist"
  | "lab"
  | "imaging"
  | "therapy"
  | "dental"
  | "other";

/** A circle member who can be assigned to take the care recipient to a visit. */
export interface Member {
  id: string;
  name: string;
  /** Two-letter monogram for the avatar fallback. */
  initials: string;
  /** Tailwind classes for the avatar tint, e.g. "bg-primary/10 text-primary". */
  color: string;
}

/** A single "ask the doctor" item on an appointment's prep checklist. */
export interface PrepQuestion {
  id: string;
  text: string;
  done: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  kind: AppointmentKind;
  provider: string;
  location: string;
  /** Resolved start time (built from the seed offset + the current day in the screen). */
  start: Date;
  durationMin: number;
  /** Member taking the care recipient, or null if unassigned. */
  assignedMemberId: string | null;
  status: AppointmentStatus;
  /** Free-text notes captured before the visit. */
  notes?: string;
  /** "Questions to ask the doctor" checklist. */
  prep: PrepQuestion[];
  /** Notes filled in after the visit. */
  visitSummary?: string;
  /** True once the visit summary has been shared to the family timeline. */
  postedToTimeline?: boolean;
}

/** Everything the Appointments screen needs, assembled server-side and passed in as one prop. */
export interface AppointmentsData {
  /** The active circle these appointments belong to — used to remount the screen on circle switch. */
  circleId: string;
  appointments: Appointment[];
  /** Assignable circle members (for "who's taking them"). */
  members: Member[];
  /** The care recipient's first name, for friendly copy (or null if not set). */
  recipientName: string | null;
}
