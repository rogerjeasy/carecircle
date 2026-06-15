"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
import { CATEGORY_VALUES, RECURRENCE_VALUES, STATUS_COLUMN_IDS } from "./data";
import { useTaskMembers } from "./members-context";
import { firstName } from "./utils";
import {
  validateTaskForm,
  type TaskErrorKey,
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
  const t = useTranslations("tasks");
  const { members } = useTaskMembers();
  const [values, setValues] = React.useState<TaskFormValues>(() =>
    initial ? taskToValues(initial) : initialValues
  );
  const [errors, setErrors] = React.useState<TaskFormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Resolve validation error keys to localized copy (literal calls keep next-intl's typing happy).
  const errorText: Record<TaskErrorKey, string> = {
    titleRequired: t("form.errors.titleRequired"),
    titleMax: t("form.errors.titleMax"),
    detailsMax: t("form.errors.detailsMax"),
  };

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
          <FormField htmlFor="title" label={t("form.title")} required full error={errors.title && errorText[errors.title]}>
            <Input
              {...fieldAria("title", errors.title && errorText[errors.title])}
              value={values.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={t("form.titlePlaceholder")}
              className={cn(errors.title && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Details */}
          <FormField htmlFor="details" label={t("form.details")} full hint={t("form.optional")} error={errors.details && errorText[errors.details]}>
            <Textarea
              {...fieldAria("details", errors.details && errorText[errors.details], t("form.optional"))}
              value={values.details}
              onChange={(e) => update({ details: e.target.value })}
              placeholder={t("form.detailsPlaceholder")}
              rows={2}
              className={cn(errors.details && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Category */}
          <FormField htmlFor="category" label={t("form.category")}>
            <Select value={values.category} onValueChange={(v) => update({ category: v as TaskCategory })}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_VALUES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`categories.${c}` as "categories.errand")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Assignee */}
          <FormField htmlFor="assigneeId" label={t("form.assignee")}>
            <Select
              value={values.assigneeId || "unassigned"}
              onValueChange={(v) => update({ assigneeId: v === "unassigned" ? "" : v })}
            >
              <SelectTrigger id="assigneeId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{t("form.unassigned")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {firstName(m.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Due date */}
          <FormField htmlFor="due" label={t("form.dueDate")} hint={t("form.optional")}>
            <Input
              id="due"
              type="date"
              value={values.due}
              onChange={(e) => update({ due: e.target.value })}
            />
          </FormField>

          {/* Status */}
          <FormField htmlFor="status" label={t("form.status")}>
            <Select value={values.status} onValueChange={(v) => update({ status: v as TaskStatus })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMN_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {t(`columns.${id}.label` as "columns.open.label")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Recurrence */}
          <FormField htmlFor="recurrence" label={t("form.repeat")} full>
            <Select value={values.recurrence} onValueChange={(v) => update({ recurrence: v as Recurrence })}>
              <SelectTrigger id="recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_VALUES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`recurrence.${r}` as "recurrence.none")}
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
            {t("form.cancel")}
          </Button>
          <Button type="submit" disabled={submitting || success} className="min-w-[9rem]">
            {success ? (
              <>
                <Check className="h-4 w-4" />
                <span className="ml-1">{t("form.saved")}</span>
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                <span className="ml-1">{t("form.saving")}</span>
              </>
            ) : (
              <span>{mode === "edit" ? t("form.saveChanges") : t("form.createTask")}</span>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
