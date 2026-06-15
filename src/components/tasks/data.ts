// Display constants for the Tasks screen. The tasks + members are loaded from the server
// (see src/lib/tasks/queries.ts) — this file only holds static presentation metadata.

import { Car, ClipboardList, FileText, Pill, Stethoscope } from "lucide-react";
import type { Task, TaskCategory, TaskStatus } from "./types";

// Labels/hints live in messages (`tasks.columns.*`, `tasks.categories.*`, `tasks.recurrence.*`),
// keyed by these stable ids/values.
export const STATUS_COLUMN_IDS: TaskStatus[] = ["open", "doing", "done"];

export const categoryMeta: Record<TaskCategory, { icon: typeof Car; tint: string }> = {
  errand: { icon: Car, tint: "bg-info/10 text-info" },
  medical: { icon: Stethoscope, tint: "bg-accent/10 text-accent" },
  admin: { icon: FileText, tint: "bg-muted text-muted-foreground" },
  refill: { icon: Pill, tint: "bg-primary/10 text-primary" },
  visit: { icon: ClipboardList, tint: "bg-success/10 text-success" },
};

export const CATEGORY_VALUES: TaskCategory[] = Object.keys(categoryMeta) as TaskCategory[];

export const RECURRENCE_VALUES: Task["recurrence"][] = ["none", "daily", "weekly", "custom"];
