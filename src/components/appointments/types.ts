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

/** The shape of the seed rows in data.ts (resolved to `Appointment` once we know "today"). */
export interface AppointmentSeed extends Omit<Appointment, "start"> {
  /** Days from today (negative = past, 0 = today, positive = upcoming). */
  dayOffset: number;
  /** "HH:mm" 24h local time. */
  time: string;
}
