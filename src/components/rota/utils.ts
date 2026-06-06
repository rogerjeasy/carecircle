// Pure helpers shared across the Care Rota screen.

import type { UserRole } from "@/components/app-shell/app-shell-context";
import { MEMBERS } from "./data";
import type { Member, Shift } from "./types";

/** Editing the rota is open to coordinators and family; others view. */
export function canManageRota(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

export function memberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "HH:mm" → minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:mm" → "9:00 AM". */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** "9:00 AM – 5:00 PM" (adds "+1" when the shift runs past midnight). */
export function timeRange(shift: Shift): string {
  const overnight = toMinutes(shift.end) <= toMinutes(shift.start);
  return `${to12h(shift.start)} – ${to12h(shift.end)}${overnight ? " +1" : ""}`;
}

/** Shifts on a given weekday, sorted by start time. */
export function shiftsForDay(shifts: Shift[], dayIndex: number): Shift[] {
  return shifts
    .filter((s) => s.dayIndex === dayIndex)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** Does a shift cover (dayIndex, minutes-into-day)? Handles overnight wrap into the next day. */
function shiftCovers(shift: Shift, dayIndex: number, minutes: number): boolean {
  const start = toMinutes(shift.start);
  const end = toMinutes(shift.end);
  const overnight = end <= start;
  if (!overnight) {
    return shift.dayIndex === dayIndex && minutes >= start && minutes < end;
  }
  // Overnight: covers [start, midnight) on its own day, and [midnight, end) on the next day.
  if (shift.dayIndex === dayIndex && minutes >= start) return true;
  const prevDay = (dayIndex + 6) % 7;
  if (shift.dayIndex === prevDay && minutes < end) return true;
  return false;
}

/** The member currently on-call (if any), based on the live clock. */
export function onCallNow(shifts: Shift[], now: Date): { shift: Shift; member: Member } | null {
  const dayIndex = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const shift = shifts.find((s) => s.type === "on-call" && shiftCovers(s, dayIndex, minutes));
  if (!shift) return null;
  const member = memberById(shift.memberId);
  return member ? { shift, member } : null;
}

/** The member physically present right now (if any). */
export function inPersonNow(shifts: Shift[], now: Date): Member | null {
  const dayIndex = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const shift = shifts.find((s) => s.type === "in-person" && shiftCovers(s, dayIndex, minutes));
  return shift ? memberById(shift.memberId) ?? null : null;
}
