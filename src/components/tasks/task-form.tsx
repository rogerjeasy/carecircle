"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, fieldAria } from "./form-field";
import { CATEGORY_OPTIONS, MEMBERS, RECURRENCE_OPTIONS, STATUS_COLUMNS } from "./data";
import { firstName } from "./utils";
import {
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormValues,
} from "./schema";
import { taskToValues } from "./mapping";
import type { Task, TaskCategory, Recurrence, TaskStatus } from "./types";

export interface TaskFormProps {
  mode: "add" | "edit";
  initial?: Task;
  /** Initial values for "add" mode (column + optional due date). */
  initialValues: TaskFormValues;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The New / Edit task form. Scrolls internally with a sticky footer; hosted in a modal. */
export function TaskForm({ mode, initial, initialValues, onSubmit, onCancel }: TaskFormProps) {
  const [values, setValues] = React.useState<TaskFormValues>(() =>
    initial ? taskToValues(initial) : initialValues
  );
  const [errors, setErrors] = React.useState<TaskFormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const update = (patch: Partial<TaskFormValues>) => setValues((v) => ({ ...v, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;
    const { ok, errors: next } = validateTaskForm(values);
    setErrors(next);
    if (!ok) {
      const first = Object.keys(next)[0];
      const el = first ? document.getElementById(first) : null;
      el?.focus();
      return;
    }
    setSubmitting(true);
    await delay(650);
    onSubmit(values);
    setSubmitting(false);
    setSuccess(true);
    await delay(500);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Title */}
          <FormField htmlFor="title" label="Title" required full error={errors.title}>
            <Input
              {...fieldAria("title", errors.title)}
              value={values.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g. Pick up prescription refill"
              className={cn(errors.title && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Details */}
          <FormField htmlFor="details" label="Details" full hint="Optional" error={errors.details}>
            <Textarea
              {...fieldAria("details", errors.details, "Optional")}
              value={values.details}
              onChange={(e) => update({ details: e.target.value })}
              placeholder="Anything helpful for whoever picks this up…"
              rows={2}
              className={cn(errors.details && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Category */}
          <FormField htmlFor="category" label="Category">
            <Select value={values.category} onValueChange={(v) => update({ category: v as TaskCategory })}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Assignee */}
          <FormField htmlFor="assigneeId" label="Assignee">
            <Select
              value={values.assigneeId || "unassigned"}
              onValueChange={(v) => update({ assigneeId: v === "unassigned" ? "" : v })}
            >
              <SelectTrigger id="assigneeId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {MEMBERS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {firstName(m.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Due date */}
          <FormField htmlFor="due" label="Due date" hint="Optional">
            <Input
              id="due"
              type="date"
              value={values.due}
              onChange={(e) => update({ due: e.target.value })}
            />
          </FormField>

          {/* Status */}
          <FormField htmlFor="status" label="Status">
            <Select value={values.status} onValueChange={(v) => update({ status: v as TaskStatus })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Recurrence */}
          <FormField htmlFor="recurrence" label="Repeat" full>
            <Select value={values.recurrence} onValueChange={(v) => update({ recurrence: v as Recurrence })}>
              <SelectTrigger id="recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || success}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || success} className="min-w-[9rem]">
            {success ? (
              <>
                <Check className="h-4 w-4" />
                <span className="ml-1">Saved</span>
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                <span className="ml-1">Saving…</span>
              </>
            ) : (
              <span>{mode === "edit" ? "Save changes" : "Create task"}</span>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
