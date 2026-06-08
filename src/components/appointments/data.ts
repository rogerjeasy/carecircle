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

export const APPOINTMENT_KINDS: { value: AppointmentKind; label: string }[] = [
  { value: "checkup", label: "Check-up" },
  { value: "specialist", label: "Specialist" },
  { value: "lab", label: "Lab / bloods" },
  { value: "imaging", label: "Imaging / scan" },
  { value: "therapy", label: "Therapy" },
  { value: "dental", label: "Dental" },
  { value: "other", label: "Other" },
];

export const kindMeta: Record<AppointmentKind, { icon: typeof Stethoscope; tint: string; label: string }> = {
  checkup: { icon: Stethoscope, tint: "bg-primary/10 text-primary", label: "Check-up" },
  specialist: { icon: HeartPulse, tint: "bg-accent/10 text-accent", label: "Specialist" },
  lab: { icon: FlaskConical, tint: "bg-info/10 text-info", label: "Lab / bloods" },
  imaging: { icon: ScanLine, tint: "bg-info/10 text-info", label: "Imaging / scan" },
  therapy: { icon: Activity, tint: "bg-success/10 text-success", label: "Therapy" },
  dental: { icon: Smile, tint: "bg-warning/10 text-warning", label: "Dental" },
  other: { icon: CalendarClock, tint: "bg-muted text-muted-foreground", label: "Other" },
};

export const statusMeta: Record<
  AppointmentStatus,
  { label: string; variant: "secondary" | "info" | "warning" | "success" | "outline"; dot: string }
> = {
  scheduled: { label: "Scheduled", variant: "secondary", dot: "bg-muted-foreground" },
  confirmed: { label: "Confirmed", variant: "info", dot: "bg-info" },
  "needs-prep": { label: "Needs prep", variant: "warning", dot: "bg-warning" },
  completed: { label: "Completed", variant: "success", dot: "bg-success" },
  cancelled: { label: "Cancelled", variant: "outline", dot: "bg-muted-foreground" },
};
