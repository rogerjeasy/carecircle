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
