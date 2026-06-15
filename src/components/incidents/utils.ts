// Pure helpers shared across the Incidents feature.

import { isToday, isYesterday } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import type { AckStatus, Incident } from "./types";

/** Resolving an incident is limited to coordinators and family (UI role vocabulary). */
export function canResolveIncidents(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// Dates localized via native Intl (project convention). Today/Yesterday come from messages,
// passed in by the caller so this stays a pure helper.
/** Absolute time label, e.g. "Today, 2:30 PM" / "Mar 4, 2:30 PM". */
export function incidentTime(
  date: Date,
  locale: string,
  labels: { today: string; yesterday: string },
): string {
  const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  if (isToday(date)) return `${labels.today}, ${time}`;
  if (isYesterday(date)) return `${labels.yesterday}, ${time}`;
  const day = date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return `${day}, ${time}`;
}

/** "2 hours ago" — used in the comment thread / ack tracker. Localized via native Intl. */
export function relativeTime(date: Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "long" });
  const diffMs = date.getTime() - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secs] of units) {
    if (absSec >= secs || unit === "second") {
      const value = Math.round(diffMs / 1000 / secs);
      return rtf.format(value, unit);
    }
  }
  return rtf.format(0, "second");
}

// Ack-status display metadata (tints/dots). Labels resolved via `incidents.ack.<status>`.
export const ackMeta: Record<AckStatus, { tint: string; dot: string }> = {
  acknowledged: { tint: "text-success", dot: "bg-success" },
  seen: { tint: "text-info", dot: "bg-info" },
  pending: { tint: "text-muted-foreground", dot: "bg-muted-foreground/40" },
};

/** Counts for the ack tracker summary. */
export function ackSummary(incident: Incident): { acknowledged: number; seen: number; pending: number; total: number } {
  const total = incident.notifications.length;
  const acknowledged = incident.notifications.filter((n) => n.status === "acknowledged").length;
  const seen = incident.notifications.filter((n) => n.status === "seen").length;
  return { acknowledged, seen, pending: total - acknowledged - seen, total };
}
