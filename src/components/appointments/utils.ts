// Pure helpers shared across the Appointments screen.

import { format, isPast, isSameDay, isToday, isTomorrow, isYesterday } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import { MEMBERS } from "./data";
import type { Appointment, Member } from "./types";

/** Scheduling/editing is open to active caregiving roles; recipients and read-only members view. */
export function canManageAppointments(role: UserRole): boolean {
  return role === "coordinator" || role === "family" || role === "caregiver";
}

/** Look up a member by id (e.g. the assigned one). */
export function memberById(id: string | null | undefined): Member | undefined {
  if (!id) return undefined;
  return MEMBERS.find((m) => m.id === id);
}

/** First name only, for compact "Paolo is taking him" style attribution. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** An appointment counts as "past" once its start time has elapsed (cancelled ones too). */
export function isHistoric(appt: Appointment): boolean {
  return appt.status === "completed" || appt.status === "cancelled" || isPast(appt.start);
}

/** "Today" / "Tomorrow" / "Yesterday" / "Mon, Jun 9" — a friendly day label. */
export function friendlyDay(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

/** Compact time label, e.g. "10:30 AM". */
export function timeLabel(date: Date): string {
  return format(date, "h:mm a");
}

/** "Tue, Jun 9 · 10:30 AM" — the one-line date+time used on cards and the detail header. */
export function dateTimeLabel(date: Date): string {
  return `${friendlyDay(date)} · ${timeLabel(date)}`;
}

/** Sort ascending by start (upcoming) — soonest first. */
export function byStartAsc(a: Appointment, b: Appointment): number {
  return a.start.getTime() - b.start.getTime();
}

/** Sort descending by start (past) — most recent first. */
export function byStartDesc(a: Appointment, b: Appointment): number {
  return b.start.getTime() - a.start.getTime();
}

/** All appointments that fall on a given calendar day, soonest first. */
export function appointmentsOnDay(appts: Appointment[], day: Date): Appointment[] {
  return appts.filter((a) => isSameDay(a.start, day)).sort(byStartAsc);
}

/** Count of done / total prep questions, for the "2/3 ready" hint. */
export function prepProgress(appt: Appointment): { done: number; total: number } {
  return { done: appt.prep.filter((q) => q.done).length, total: appt.prep.length };
}
