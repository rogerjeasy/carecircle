"use client";

import { ResponsiveModal } from "./responsive-modal";
import { TaskForm } from "./task-form";
import type { TaskFormValues } from "./schema";
import type { Task } from "./types";

export interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial?: Task;
  initialValues: TaskFormValues;
  onSubmit: (values: TaskFormValues) => void;
}

/** New / Edit task, in a Dialog on tablet+ and a bottom Sheet on phone. */
export function TaskFormModal({ open, onOpenChange, mode, initial, initialValues, onSubmit }: TaskFormModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit task" : "New task"}
      description={mode === "edit" ? "Update the details and assignment." : "Add a task and share the load."}
    >
      <TaskForm
        mode={mode}
        initial={initial}
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveModal>
  );
}
