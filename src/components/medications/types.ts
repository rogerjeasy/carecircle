// Shared domain types for the Medications screen.

export type Period = "Morning" | "Afternoon" | "Evening" | "Night";
export type DoseStatus = "upcoming" | "given" | "missed" | "skipped" | "refused";
export type GivenBy = "patient" | "caregiver";

export interface Dose {
  id: string;
  medId: string;
  name: string;
  strength: string;
  purpose: string;
  time: string; // human label e.g. "8:00am"
  period: Period;
  status: DoseStatus;
  givenAt?: string;
  givenByName?: string;
  givenVia?: GivenBy;
  // Set when the dose comes from the server: identifies the exact schedule occurrence so the
  // record/undo actions persist (and stay idempotent) against the right row. Absent for demo data.
  scheduleId?: string;
  scheduledForISO?: string;
}

export interface PrnMed {
  id: string; // the medication id (used by the "Log dose" action)
  name: string;
  strength: string;
  purpose: string;
  maxPerDay: number;
  takenToday: number;
  lastTaken?: string;
}

/** A single day's column in the weekly adherence mini-view. */
export interface AdherenceDay {
  /** ISO date (yyyy-MM-dd) for the column. */
  date: string;
  /** One cell per recorded/expected dose that day. */
  cells: ("given" | "missed" | "upcoming")[];
}

/** Server-computed weekly adherence summary for the Today tab's mini-grid. */
export interface AdherenceSummary {
  given: number;
  missed: number;
  days: AdherenceDay[];
}

/** Everything the Medications screen needs, assembled server-side and passed in as one prop. */
export interface MedicationsData {
  /** The active circle this data belongs to — used to remount the screen on circle switch. */
  circleId: string;
  meds: Medication[];
  doses: Dose[];
  prn: PrnMed[];
  adherence: AdherenceSummary;
}

export interface Medication {
  id: string;
  name: string;
  strength: string;
  form: string;
  purpose: string;
  schedule: string;
  prescriber: string;
  supplyDays: number;
  active: boolean;
  discontinued?: boolean;
  discontinuedNote?: string;
  // Structured fields the Add/Edit form needs to round-trip faithfully (the `schedule` string above
  // is display-only). Populated by the server reader and the create/update actions; absent for
  // demo/optimistic-only rows, in which case the form falls back to sensible defaults.
  route?: string;
  instructions?: string;
  isPrn?: boolean;
  prnMaxPerDay?: number | null;
  refillThreshold?: number;
  /** The exact dose times/days behind `schedule`, so editing preserves them. */
  scheduleRows?: { time: string; days: number[] }[];
  /** Resolved (presigned) URL of the primary pill photo, ready for <img src>. */
  photoUrl?: string | null;
  /** Additional files (images + documents) attached to this medication, with resolved URLs. */
  attachments?: MedAttachment[];
}

/** A file attached to a medication: a pill photo / scan (image) or a leaflet / PDF (document). */
export interface MedAttachment {
  id: string;
  kind: "image" | "document";
  fileName: string;
  /** Short-lived presigned URL for <img src> / download link, or null if it couldn't be resolved. */
  url: string | null;
  contentType?: string;
}
