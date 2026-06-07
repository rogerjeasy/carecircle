// Pure helpers shared across the Notifications center.

import { formatDistanceToNowStrict, isToday } from "date-fns";
import type { NotificationFilter, NotificationItem } from "./types";

/** "5m" / "2h" / "3d" — compact timestamp. */
export function shortTime(date: Date): string {
  return formatDistanceToNowStrict(date, { roundingMethod: "floor" })
    .replace(/ seconds?/, "s")
    .replace(/ minutes?/, "m")
    .replace(/ hours?/, "h")
    .replace(/ days?/, "d")
    .replace(/ months?/, "mo")
    .replace(/ years?/, "y");
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
