// Pure helpers shared across the Timeline.

import { format, isToday, isYesterday, startOfDay } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import type { TimelineEvent } from "./types";

export type DateRange = "all" | "7d" | "30d";

export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function groupEventsByDay(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const grouped = new Map<string, TimelineEvent[]>();

  events.forEach((event) => {
    const dayKey = startOfDay(event.timestamp).toISOString();
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, []);
    }
    grouped.get(dayKey)!.push(event);
  });

  return grouped;
}

/** Whether `date` falls within the chosen rolling range, relative to `now`. */
export function withinRange(date: Date, range: DateRange, now: Date): boolean {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : 30;
  return now.getTime() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

export function canSeePrivate(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

export function canPostPrivate(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

/** Read-only relatives follow along but can't post notes, comments, or reactions. */
export function canContribute(role: UserRole): boolean {
  return role !== "readonly";
}

// A small, stable avatar palette (matches the design tokens used across the app). Author colors
// are derived deterministically from a key (membership/user id) so the same person is always the
// same color — server and client compute it identically, keeping optimistic posts consistent.
const AUTHOR_COLORS = [
  "bg-primary/10 text-primary",
  "bg-accent/10 text-accent",
  "bg-success/10 text-success",
  "bg-info/10 text-info",
  "bg-warning/10 text-warning",
];

export function authorColorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AUTHOR_COLORS[h % AUTHOR_COLORS.length];
}

/** Two-letter monogram from a name, falling back to "?" for an empty name. */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
