// Pure helpers shared across the Incidents feature.

import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import { MEMBERS } from "./data";
import type { AckStatus, Incident, Member } from "./types";

/** Resolving an incident is limited to coordinators and family admins. */
export function canResolveIncidents(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

export function memberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Absolute, hydration-safe-ish time label, e.g. "Today, 2:30 PM" / "Mar 4, 2:30 PM". */
export function incidentTime(date: Date): string {
  if (isToday(date)) return `Today, ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

/** "2 hours ago" — used in the comment thread / ack tracker (after mount). */
export function relativeTime(date: Date): string {
  return `${formatDistanceToNowStrict(date)} ago`;
}

export const ackMeta: Record<AckStatus, { label: string; tint: string; dot: string }> = {
  acknowledged: { label: "Acknowledged", tint: "text-success", dot: "bg-success" },
  seen: { label: "Seen", tint: "text-info", dot: "bg-info" },
  pending: { label: "Not yet seen", tint: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

/** Counts for the ack tracker summary. */
export function ackSummary(incident: Incident): { acknowledged: number; seen: number; pending: number; total: number } {
  const total = incident.notifications.length;
  const acknowledged = incident.notifications.filter((n) => n.status === "acknowledged").length;
  const seen = incident.notifications.filter((n) => n.status === "seen").length;
  return { acknowledged, seen, pending: total - acknowledged - seen, total };
}
