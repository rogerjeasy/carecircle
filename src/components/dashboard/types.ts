// Shared types for the dashboard.

import type { StatusLevel } from "@/components/health/types";

export type DayStatus = "good" | "okay" | "attention" | "unknown";

export interface WeekDay {
  day: string;
  status: DayStatus;
  label: string;
}

/** The care recipient at the center of the active circle (name, photo, clinical summary). */
export interface DashboardRecipient {
  fullName: string;
  firstName: string;
  initials: string;
  avatarUrl: string | null;
  age: number | null;
  /** Formatted date of birth, e.g. "12 March 1948". */
  dob: string | null;
  bloodType: string | null;
  conditions: string[];
  allergies: string[];
}

/** A scheduled dose for today, collapsed to the three states the dashboard cards show. */
export interface DashboardDose {
  id: string;
  name: string;
  strength: string;
  purpose: string;
  /** Human time label, e.g. "8:00am". */
  time: string;
  status: "given" | "upcoming" | "missed";
  /** First name of who gave it (scheduled doses only). */
  givenByName?: string;
}

/** A task item for the caregiver's "My tasks" checklist. */
export interface DashboardTaskItem {
  id: string;
  title: string;
  done: boolean;
}

/** An upcoming appointment, with a friendly relative label. */
export interface DashboardAppointmentItem {
  id: string;
  title: string;
  provider: string;
  location: string;
  /** e.g. "Today, 10:30 AM" / "Tomorrow, 9:00 AM" / "Thu, 2:00 PM". */
  whenLabel: string;
}

/** A recent timeline update, shaped for the dashboard feed. */
export interface DashboardUpdate {
  id: string;
  type: string;
  text: string;
  /** Relative time, e.g. "20 minutes ago". */
  timeLabel: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  hearts: number;
}

/** Who is on call right now (from the rota). */
export interface DashboardOnCall {
  name: string;
  initials: string;
  /** Avatar tint classes, e.g. "bg-accent/10 text-accent". */
  color: string;
  /** e.g. "Until 6:00 PM". */
  untilLabel: string;
}

/** One member's caregiving hours this week (fair-share bar). */
export interface DashboardFairShare {
  name: string;
  hours: number;
  /** Solid bar colour class, e.g. "bg-primary". */
  color: string;
}

/** The AI daily digest, condensed for the dashboard cards. */
export interface DashboardDigest {
  headline: string;
  paragraph: string;
}

/** The four headline stats on the coordinator dashboard. */
export interface DashboardStats {
  medsGivenToday: number;
  medsTotalToday: number;
  /** Next upcoming dose time, e.g. "6:00pm", or null when none remain. */
  nextDoseLabel: string | null;
  nextAppointment: { whenLabel: string; title: string; subtitle: string } | null;
  openTasks: number;
  tasksDueToday: number;
  /** Latest vital sign reading (defaults to blood pressure). */
  latestVital: { value: string; label: string; status: StatusLevel } | null;
  /** Recent values of the latest vital, for the sparkline. */
  vitalSparkline: { v: number }[];
  /** Latest recorded mood label, e.g. "Good". */
  moodLabel: string | null;
}

/** A current medication with its 7-day adherence (clinician view). */
export interface DashboardClinicalMed {
  name: string;
  strength: string;
  schedule: string;
  adherence: number | null;
}

/** A point on a vitals trend chart. `sys`/`dia` for blood pressure; `v` for single-value metrics. */
export interface DashboardTrendPoint {
  label: string;
  sys?: number;
  dia?: number;
  v?: number;
}

/** A recent incident (derived from the timeline). */
export interface DashboardIncident {
  type: string;
  severity: string;
  when: string;
  summary: string;
}

/** A medical document reference (clinician view). */
export interface DashboardDocItem {
  title: string;
  kind: string;
  date: string;
}

/** The clinician's read-only clinical lens. */
export interface DashboardClinical {
  meds: DashboardClinicalMed[];
  bpTrend: DashboardTrendPoint[];
  glucoseTrend: DashboardTrendPoint[];
  incidents: DashboardIncident[];
  documents: DashboardDocItem[];
}

/**
 * Everything the role-aware dashboard renders, assembled server-side for the ACTIVE circle and
 * passed down as one prop. Every slice is circle-scoped (RLS + active-circle pin). Used across all
 * role experiences (coordinator / caregiver / recipient / read-only / clinician); each reads the
 * slices it needs.
 */
export interface DashboardData {
  /** The active circle this data belongs to — used to remount the dashboard on circle switch. */
  circleId: string;
  recipient: DashboardRecipient | null;
  stats: DashboardStats;
  todayDoses: DashboardDose[];
  myTasks: DashboardTaskItem[];
  todayAppointments: DashboardAppointmentItem[];
  recentUpdates: DashboardUpdate[];
  onCall: DashboardOnCall | null;
  fairShare: DashboardFairShare[];
  weekAtGlance: WeekDay[];
  digest: DashboardDigest | null;
  /** Coordinator banner secondary line, e.g. "Mood: cheerful · Last update 20 minutes ago by Grace". */
  bannerSubtext: string;
  clinical: DashboardClinical;
  /** Primary emergency contact for the recipient's "Call family" action. */
  emergencyContact: { name: string; phone: string } | null;
}
