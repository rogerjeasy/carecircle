// Display constants for the Appointments screen. The appointments + members are loaded from the
// server (see src/lib/appointments/queries.ts) — this file only holds static presentation metadata.

import {
  Activity,
  CalendarClock,
  FlaskConical,
  HeartPulse,
  ScanLine,
  Smile,
  Stethoscope,
} from "lucide-react";
import type { AppointmentKind, AppointmentStatus } from "./types";

// Labels live in messages (`appointments.kinds.*` / `appointments.status.*`), keyed by these values.
export const APPOINTMENT_KIND_VALUES: AppointmentKind[] = [
  "checkup",
  "specialist",
  "lab",
  "imaging",
  "therapy",
  "dental",
  "other",
];

export const kindMeta: Record<AppointmentKind, { icon: typeof Stethoscope; tint: string }> = {
  checkup: { icon: Stethoscope, tint: "bg-primary/10 text-primary" },
  specialist: { icon: HeartPulse, tint: "bg-accent/10 text-accent" },
  lab: { icon: FlaskConical, tint: "bg-info/10 text-info" },
  imaging: { icon: ScanLine, tint: "bg-info/10 text-info" },
  therapy: { icon: Activity, tint: "bg-success/10 text-success" },
  dental: { icon: Smile, tint: "bg-warning/10 text-warning" },
  other: { icon: CalendarClock, tint: "bg-muted text-muted-foreground" },
};

export const statusMeta: Record<
  AppointmentStatus,
  { variant: "secondary" | "info" | "warning" | "success" | "outline"; dot: string }
> = {
  scheduled: { variant: "secondary", dot: "bg-muted-foreground" },
  confirmed: { variant: "info", dot: "bg-info" },
  "needs-prep": { variant: "warning", dot: "bg-warning" },
  completed: { variant: "success", dot: "bg-success" },
  cancelled: { variant: "outline", dot: "bg-muted-foreground" },
};
