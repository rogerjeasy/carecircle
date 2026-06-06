// Demo seed data + display constants for the Appointments screen.
// (Static mock data — the real app would load these from the circle-scoped DAL.)

import {
  Activity,
  CalendarClock,
  FlaskConical,
  HeartPulse,
  ScanLine,
  Smile,
  Stethoscope,
} from "lucide-react";
import { addDays, startOfDay } from "date-fns";
import type {
  Appointment,
  AppointmentKind,
  AppointmentSeed,
  AppointmentStatus,
  Member,
} from "./types";

/** The person being cared for — referenced in copy like "Paolo is taking him". */
export const CARE_RECIPIENT = { name: "Antonio", pronounObject: "him" } as const;

/** Circle members who can be assigned to a visit (mirrors the timeline's cast + colors). */
export const MEMBERS: Member[] = [
  { id: "maria", name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent" },
  { id: "grace", name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary" },
  { id: "paolo", name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info" },
  { id: "carlos", name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success" },
];

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

/** Seed rows expressed as day-offsets so the demo stays "live" relative to the real today. */
const seed: AppointmentSeed[] = [
  {
    id: "appt-physio",
    title: "Physiotherapy session",
    kind: "therapy",
    provider: "James Wood, PT",
    location: "Home visit",
    dayOffset: 1,
    time: "09:00",
    durationMin: 45,
    assignedMemberId: "paolo",
    status: "confirmed",
    notes: "Focus on balance and the new walking-frame technique.",
    prep: [
      { id: "q1", text: "Ask about exercises to do between visits", done: true },
      { id: "q2", text: "Is the walking frame the right height?", done: false },
    ],
  },
  {
    id: "appt-cardio",
    title: "Cardiology follow-up",
    kind: "specialist",
    provider: "Dr. Chen",
    location: "City Heart Clinic · Suite 4",
    dayOffset: 2,
    time: "10:30",
    durationMin: 30,
    assignedMemberId: "paolo",
    status: "confirmed",
    notes: "Bring the home blood-pressure log from the last two weeks.",
    prep: [
      { id: "q1", text: "Review whether the Lisinopril dose is still right", done: false },
      { id: "q2", text: "Ask about the occasional dizziness in the mornings", done: false },
      { id: "q3", text: "Confirm next blood test timing", done: false },
    ],
  },
  {
    id: "appt-bloods",
    title: "Fasting blood test",
    kind: "lab",
    provider: "Riverside Pathology",
    location: "Riverside Lab · Ground floor",
    dayOffset: 5,
    time: "08:00",
    durationMin: 15,
    assignedMemberId: "grace",
    status: "scheduled",
    notes: "No food after midnight — water is fine.",
    prep: [{ id: "q1", text: "Confirm which panels Dr. Patel ordered", done: false }],
  },
  {
    id: "appt-memory",
    title: "Memory clinic review",
    kind: "specialist",
    provider: "Dr. Okafor",
    location: "Neurology Centre · 2nd floor",
    dayOffset: 9,
    time: "14:00",
    durationMin: 60,
    assignedMemberId: null,
    status: "needs-prep",
    notes: "",
    prep: [
      { id: "q1", text: "Bring the updated medication list", done: false },
      { id: "q2", text: "Note the recent changes in sleep", done: false },
    ],
  },
  {
    id: "appt-dental",
    title: "Dental cleaning",
    kind: "dental",
    provider: "Dr. Lee",
    location: "Bright Smile Dental",
    dayOffset: 16,
    time: "11:15",
    durationMin: 40,
    assignedMemberId: "carlos",
    status: "scheduled",
    prep: [],
  },
  {
    id: "appt-gp",
    title: "GP general check-up",
    kind: "checkup",
    provider: "Dr. Chen",
    location: "Maple Family Practice",
    dayOffset: -3,
    time: "09:30",
    durationMin: 30,
    assignedMemberId: "grace",
    status: "completed",
    prep: [
      { id: "q1", text: "Flu jab timing", done: true },
      { id: "q2", text: "Repeat prescription for Metformin", done: true },
    ],
    visitSummary:
      "All vitals stable. Flu jab booked for next month. Repeat prescription approved — pharmacy will have it ready Friday.",
    postedToTimeline: true,
  },
  {
    id: "appt-eye",
    title: "Annual eye exam",
    kind: "checkup",
    provider: "Dr. Stone, Optometry",
    location: "ClearView Opticians",
    dayOffset: -10,
    time: "15:00",
    durationMin: 30,
    assignedMemberId: "maria",
    status: "completed",
    prep: [],
    visitSummary: "Prescription unchanged. New reading glasses ordered, ready in 7–10 days.",
    postedToTimeline: false,
  },
  {
    id: "appt-cardio-prev",
    title: "Cardiology — initial consult",
    kind: "specialist",
    provider: "Dr. Chen",
    location: "City Heart Clinic · Suite 4",
    dayOffset: -31,
    time: "10:00",
    durationMin: 45,
    assignedMemberId: "paolo",
    status: "completed",
    prep: [],
    visitSummary:
      "Started on Lisinopril 10mg. Home BP monitoring recommended. Follow-up booked in one month.",
    postedToTimeline: true,
  },
];

/** Resolve the seed into concrete `Appointment`s relative to a fixed "today" captured by the screen. */
export function buildAppointments(now: Date): Appointment[] {
  return seed.map(({ dayOffset, time, ...rest }) => {
    const [h, m] = time.split(":").map(Number);
    const start = addDays(startOfDay(now), dayOffset);
    start.setHours(h, m, 0, 0);
    return { ...rest, start };
  });
}
