// Form values + validation for the New / Edit task form.

import { format } from "date-fns";
import type { Recurrence, TaskCategory, TaskStatus } from "./types";

export interface TaskFormValues {
  title: string;
  details: string;
  category: TaskCategory;
  status: TaskStatus;
  assigneeId: string; // "" = unassigned
  due: string; // "yyyy-MM-dd" or ""
  recurrence: Recurrence;
}

// Validation produces stable error KEYS (resolved to localized copy by the form via `errors.*`).
export type TaskErrorKey = "titleRequired" | "titleMax" | "detailsMax";
export type TaskFormErrors = Partial<Record<keyof TaskFormValues, TaskErrorKey>>;

export function validateTaskForm(values: TaskFormValues): { ok: boolean; errors: TaskFormErrors } {
  const errors: TaskFormErrors = {};
  if (!values.title.trim()) errors.title = "titleRequired";
  else if (values.title.trim().length > 140) errors.title = "titleMax";
  if (values.details.length > 500) errors.details = "detailsMax";
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Empty form values for "New task", defaulting the column (status) and optional due date. */
export function emptyTaskValues(status: TaskStatus, due?: Date): TaskFormValues {
  return {
    title: "",
    details: "",
    category: "errand",
    status,
    assigneeId: "",
    due: due ? format(due, "yyyy-MM-dd") : "",
    recurrence: "none",
  };
}
