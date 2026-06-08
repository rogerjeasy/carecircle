// Shared domain types for the Tasks screen.

export type TaskStatus = "open" | "doing" | "done";

export type TaskCategory = "errand" | "medical" | "admin" | "refill" | "visit";

export type Recurrence = "none" | "daily" | "weekly" | "custom";

/** A circle member who can be assigned tasks (and whose fair-share is tracked). */
export interface Member {
  id: string;
  name: string;
  /** Two-letter monogram for the avatar fallback. */
  initials: string;
  /** Tailwind classes for the avatar tint, e.g. "bg-primary/10 text-primary". */
  color: string;
  /** Solid colour for the fair-share bar chart (a CSS colour, e.g. "hsl(var(--chart-1))"). */
  bar: string;
}

export interface Task {
  id: string;
  title: string;
  details?: string;
  category: TaskCategory;
  status: TaskStatus;
  /** Member responsible, or null if unassigned. */
  assigneeId: string | null;
  /** Due date (date-only semantics; the time is ignored for overdue checks). */
  due: Date | null;
  recurrence: Recurrence;
  /** Manual ordering within a column (lower = higher up). */
  order: number;
}

/** Everything the Tasks screen needs, assembled server-side and passed in as one prop. */
export interface TasksData {
  /** The active circle these tasks belong to — used to remount the screen on circle switch. */
  circleId: string;
  tasks: Task[];
  /** Assignable circle members (for the assignee picker + fair-share chart). */
  members: Member[];
}
