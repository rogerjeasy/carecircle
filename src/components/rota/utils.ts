// Pure helpers shared across the Care Rota screen.

import type { UserRole } from "@/components/app-shell/app-shell-context";
import type { Member, Shift } from "./types";

/** Editing the rota is open to coordinators and family; others view. */
export function canManageRota(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "HH:mm" → minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "HH:mm" → "9:00 AM". Locale-independent; used by server code that has no request locale. */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** "HH:mm" → a locale-formatted clock time (e.g. "9:00 AM" or "09:00"). */
export function formatTime(locale: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2023, 0, 1, h, m).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/**
 * Localized weekday name. `dayIndex` is 0=Sunday..6=Saturday to match `Date.getDay()` and the
 * `dayIndex` stored on shifts — independent of the locale's own first-day-of-week.
 */
export function weekdayLabel(locale: string, dayIndex: number, style: "short" | "long"): string {
  // 2023-01-01 (UTC) was a Sunday; add dayIndex days to land on the wanted weekday.
  const d = new Date(Date.UTC(2023, 0, 1 + dayIndex));
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(d);
}

/** Locale-formatted short month + day (e.g. "Jun 14"). */
export function monthDay(locale: string, date: Date): string {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * "9:00 AM – 5:00 PM" (appends `overnightSuffix`, e.g. "+1", when the shift runs past midnight).
 * The suffix is passed in so the caller resolves it from messages.
 */
export function timeRange(locale: string, shift: Shift, overnightSuffix: string): string {
  const overnight = toMinutes(shift.end) <= toMinutes(shift.start);
  return `${formatTime(locale, shift.start)} – ${formatTime(locale, shift.end)}${overnight ? ` ${overnightSuffix}` : ""}`;
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
export function onCallNow(shifts: Shift[], now: Date, members: Member[]): { shift: Shift; member: Member } | null {
  const dayIndex = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const shift = shifts.find((s) => s.type === "on-call" && shiftCovers(s, dayIndex, minutes));
  if (!shift) return null;
  const member = members.find((m) => m.id === shift.memberId);
  return member ? { shift, member } : null;
}

/** The member physically present right now (if any). */
export function inPersonNow(shifts: Shift[], now: Date, members: Member[]): Member | null {
  const dayIndex = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const shift = shifts.find((s) => s.type === "in-person" && shiftCovers(s, dayIndex, minutes));
  return shift ? members.find((m) => m.id === shift.memberId) ?? null : null;
}
