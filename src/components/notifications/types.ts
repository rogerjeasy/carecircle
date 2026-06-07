// Shared domain types for the Notifications center.

export type NotificationType = "med" | "vital" | "task" | "incident" | "mention" | "appointment" | "digest";

export interface Actor {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  /** Whether it's flagged urgent (pinned + calm red emphasis). */
  urgent: boolean;
  /** Who triggered it (omitted for system notifications like the digest). */
  actor?: Actor;
  /** Short, scannable summary. */
  summary: string;
  /** Where tapping it deep-links to. */
  href: string;
  at: Date;
  read: boolean;
}

export interface NotificationSeed extends Omit<NotificationItem, "at"> {
  /** Minutes ago. */
  minutesAgo: number;
}

export type NotificationFilter = "all" | "mentions" | "urgent" | "tasks";
