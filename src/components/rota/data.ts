// Demo seed data + display constants for the Care Rota screen.

import type { Member, Shift } from "./types";

/** Circle members + their shift-block colour treatment. */
export const MEMBERS: Member[] = [
  { id: "grace", name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary", block: "bg-primary/10 border-primary/30 text-primary" },
  { id: "maria", name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent", block: "bg-accent/10 border-accent/30 text-accent-foreground" },
  { id: "paolo", name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info", block: "bg-info/10 border-info/30 text-info" },
  { id: "carlos", name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success", block: "bg-success/10 border-success/30 text-success" },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * A representative week. Times are local "HH:mm". Overnight on-call shifts (end <= start) wrap into
 * the next morning. Designed so that someone is on-call across most of the day/night.
 */
export const SHIFTS: Shift[] = [
  // Sunday
  { id: "s-sun-1", memberId: "maria", dayIndex: 0, start: "09:00", end: "17:00", type: "in-person" },
  { id: "s-sun-2", memberId: "carlos", dayIndex: 0, start: "17:00", end: "09:00", type: "on-call" },
  // Monday
  { id: "s-mon-1", memberId: "grace", dayIndex: 1, start: "08:00", end: "16:00", type: "in-person" },
  { id: "s-mon-2", memberId: "paolo", dayIndex: 1, start: "16:00", end: "20:00", type: "in-person" },
  { id: "s-mon-3", memberId: "grace", dayIndex: 1, start: "20:00", end: "08:00", type: "on-call" },
  // Tuesday
  { id: "s-tue-1", memberId: "grace", dayIndex: 2, start: "08:00", end: "16:00", type: "in-person" },
  { id: "s-tue-2", memberId: "maria", dayIndex: 2, start: "16:00", end: "08:00", type: "on-call" },
  // Wednesday
  { id: "s-wed-1", memberId: "paolo", dayIndex: 3, start: "09:00", end: "17:00", type: "in-person" },
  { id: "s-wed-2", memberId: "carlos", dayIndex: 3, start: "17:00", end: "09:00", type: "on-call" },
  // Thursday
  { id: "s-thu-1", memberId: "grace", dayIndex: 4, start: "08:00", end: "14:00", type: "in-person" },
  { id: "s-thu-2", memberId: "maria", dayIndex: 4, start: "14:00", end: "22:00", type: "in-person" },
  { id: "s-thu-3", memberId: "paolo", dayIndex: 4, start: "22:00", end: "08:00", type: "on-call" },
  // Friday
  { id: "s-fri-1", memberId: "grace", dayIndex: 5, start: "08:00", end: "16:00", type: "in-person" },
  { id: "s-fri-2", memberId: "carlos", dayIndex: 5, start: "16:00", end: "08:00", type: "on-call" },
  // Saturday
  { id: "s-sat-1", memberId: "maria", dayIndex: 6, start: "10:00", end: "18:00", type: "in-person" },
  { id: "s-sat-2", memberId: "grace", dayIndex: 6, start: "18:00", end: "10:00", type: "on-call" },
];
