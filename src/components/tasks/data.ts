// Display constants for the Tasks screen. The tasks + members are loaded from the server
// (see src/lib/tasks/queries.ts) — this file only holds static presentation metadata.

import { Car, ClipboardList, FileText, Pill, Stethoscope } from "lucide-react";
import type { Task, TaskCategory, TaskStatus } from "./types";

export const STATUS_COLUMNS: { id: TaskStatus; label: string; hint: string }[] = [
  { id: "open", label: "Open", hint: "Not started" },
  { id: "doing", label: "Doing", hint: "In progress" },
  { id: "done", label: "Done", hint: "Completed" },
];

export const categoryMeta: Record<
  TaskCategory,
  { label: string; icon: typeof Car; tint: string }
> = {
  errand: { label: "Errand", icon: Car, tint: "bg-info/10 text-info" },
  medical: { label: "Medical", icon: Stethoscope, tint: "bg-accent/10 text-accent" },
  admin: { label: "Admin", icon: FileText, tint: "bg-muted text-muted-foreground" },
  refill: { label: "Refill", icon: Pill, tint: "bg-primary/10 text-primary" },
  visit: { label: "Visit", icon: ClipboardList, tint: "bg-success/10 text-success" },
};

export const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = (
  Object.keys(categoryMeta) as TaskCategory[]
).map((value) => ({ value, label: categoryMeta[value].label }));

export const RECURRENCE_OPTIONS: { value: Task["recurrence"]; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom…" },
];
