// Conversions between the task form values and the `Task` domain object.

import { format, parse } from "date-fns";
import type { TaskFormValues } from "./schema";
import type { Task } from "./types";

/** Form values → a full `Task`. On edit, the manual `order` is carried over from `prev`. */
export function valuesToTask(values: TaskFormValues, id: string, order: number, prev?: Task): Task {
  return {
    id,
    title: values.title.trim(),
    details: values.details.trim() || undefined,
    category: values.category,
    status: values.status,
    assigneeId: values.assigneeId || null,
    due: values.due ? parse(values.due, "yyyy-MM-dd", new Date()) : null,
    recurrence: values.recurrence,
    order: prev?.order ?? order,
  };
}

/** An existing `Task` → editable form values. */
export function taskToValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    details: task.details ?? "",
    category: task.category,
    status: task.status,
    assigneeId: task.assigneeId ?? "",
    due: task.due ? format(task.due, "yyyy-MM-dd") : "",
    recurrence: task.recurrence,
  };
}
