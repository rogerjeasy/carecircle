// Pure helpers shared across the Notifications center.

import { isToday } from "date-fns";
import type { NotificationFilter, NotificationItem } from "./types";

/**
 * Compact, localized relative timestamp, e.g. "2h ago" / "just now". Localized via native Intl
 * (project convention). `justNow` is passed in from messages so this stays a pure helper.
 */
export function shortTime(date: Date, locale: string, justNow: string): string {
  const diffMs = date.getTime() - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  if (absSec < 45) return justNow;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (absSec >= secs) {
      const value = Math.round(diffMs / 1000 / secs);
      return rtf.format(value, unit);
    }
  }
  return rtf.format(Math.round(diffMs / 1000 / 60), "minute");
}

export function matchesFilter(n: NotificationItem, filter: NotificationFilter): boolean {
  if (filter === "all") return true;
  if (filter === "mentions") return n.type === "mention";
  if (filter === "urgent") return n.urgent;
  if (filter === "tasks") return n.type === "task";
  return true;
}

export function unreadCount(items: NotificationItem[]): number {
  return items.filter((n) => !n.read).length;
}

/**
 * Sort + group for display: urgent unresolved items pinned to the very top, then Today / Earlier,
 * each newest-first.
 */
export function groupNotifications(items: NotificationItem[]): {
  pinned: NotificationItem[];
  today: NotificationItem[];
  earlier: NotificationItem[];
} {
  const byNewest = [...items].sort((a, b) => b.at.getTime() - a.at.getTime());
  const pinned = byNewest.filter((n) => n.urgent && !n.read);
  const rest = byNewest.filter((n) => !(n.urgent && !n.read));
  return {
    pinned,
    today: rest.filter((n) => isToday(n.at)),
    earlier: rest.filter((n) => !isToday(n.at)),
  };
}
