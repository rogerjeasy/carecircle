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
}

export interface PrnMed {
  id: string;
  name: string;
  strength: string;
  purpose: string;
  maxPerDay: number;
  takenToday: number;
  lastTaken?: string;
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
}
