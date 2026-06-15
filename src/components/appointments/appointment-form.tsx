"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField, fieldAria } from "./form-field";
import { APPOINTMENT_KIND_VALUES } from "./data";
import { useApptMembers } from "./members-context";
import { firstName } from "./utils";
import {
  buildAppointmentFormSchema,
  emptyValues,
  validateAppointmentForm,
  type AppointmentFormErrors,
  type AppointmentFormValues,
} from "./schema";
import { appointmentToValues } from "./mapping";
import type { Appointment, AppointmentKind, AppointmentStatus } from "./types";

const STATUS_OPTIONS: AppointmentStatus[] = ["scheduled", "confirmed", "needs-prep", "completed", "cancelled"];

export interface AppointmentFormProps {
  mode: "add" | "edit";
  initial?: Appointment;
  /** Default date for a new appointment (the day selected in the calendar). */
  defaultDate: Date;
  onSubmit: (values: AppointmentFormValues) => void;
  onCancel: () => void;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The Add / Edit appointment form. Scrolls internally with a sticky footer; hosted in a modal. */
export function AppointmentForm({ mode, initial, defaultDate, onSubmit, onCancel }: AppointmentFormProps) {
  const t = useTranslations("appointments");
  const { members } = useApptMembers();
  const [values, setValues] = React.useState<AppointmentFormValues>(() =>
    initial ? appointmentToValues(initial) : emptyValues(defaultDate)
  );
  const [errors, setErrors] = React.useState<AppointmentFormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Build the zod schema with localized messages (rebuilt only when the language changes).
  const schema = React.useMemo(
    () =>
      buildAppointmentFormSchema({
        title: t("form.errors.title"),
        kind: t("form.errors.kind"),
        provider: t("form.errors.provider"),
        location: t("form.errors.location"),
        date: t("form.errors.date"),
        time: t("form.errors.time"),
        durationNumber: t("form.errors.durationNumber"),
        durationInt: t("form.errors.durationInt"),
        durationMin: t("form.errors.durationMin"),
        durationMax: t("form.errors.durationMax"),
      }),
    [t]
  );

  const update = React.useCallback((patch: Partial<AppointmentFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
  }, []);

  const err = (key: string) => errors[key];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;

    const { ok, errors: nextErrors } = validateAppointmentForm(values, schema);
    setErrors(nextErrors);
    if (!ok) {
      const firstKey = Object.keys(nextErrors)[0];
      const el = firstKey ? document.getElementById(firstKey) : null;
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    await delay(700); // simulate persistence
    onSubmit(values);
    setSubmitting(false);
    setSuccess(true);
    await delay(550);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Title */}
          <FormField htmlFor="title" label={t("form.title")} required full error={err("title")}>
            <Input
              {...fieldAria("title", err("title"))}
              value={values.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={t("form.titlePlaceholder")}
              className={cn(err("title") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Type */}
          <FormField htmlFor="kind" label={t("form.type")} required error={err("kind")}>
            <Select value={values.kind} onValueChange={(v) => update({ kind: v as AppointmentKind })}>
              <SelectTrigger id="kind">
                <SelectValue placeholder={t("form.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_KIND_VALUES.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`kinds.${k}` as "kinds.checkup")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Status */}
          <FormField htmlFor="status" label={t("form.status")} error={err("status")}>
            <Select value={values.status} onValueChange={(v) => update({ status: v as AppointmentStatus })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s}` as "status.scheduled")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Provider */}
          <FormField htmlFor="provider" label={t("form.provider")} required error={err("provider")}>
            <Input
              {...fieldAria("provider", err("provider"))}
              value={values.provider}
              onChange={(e) => update({ provider: e.target.value })}
              placeholder={t("form.providerPlaceholder")}
              className={cn(err("provider") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Location */}
          <FormField htmlFor="location" label={t("form.location")} error={err("location")}>
            <Input
              {...fieldAria("location", err("location"))}
              value={values.location}
              onChange={(e) => update({ location: e.target.value })}
              placeholder={t("form.locationPlaceholder")}
              className={cn(err("location") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Date */}
          <FormField htmlFor="date" label={t("form.date")} required error={err("date")}>
            <Input
              {...fieldAria("date", err("date"))}
              type="date"
              value={values.date}
              onChange={(e) => update({ date: e.target.value })}
              className={cn(err("date") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Time */}
          <FormField htmlFor="time" label={t("form.time")} required error={err("time")}>
            <Input
              {...fieldAria("time", err("time"))}
              type="time"
              value={values.time}
              onChange={(e) => update({ time: e.target.value })}
              className={cn(err("time") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Duration */}
          <FormField htmlFor="durationMin" label={t("form.duration")} hint={t("form.durationHint")} error={err("durationMin")}>
            <Input
              {...fieldAria("durationMin", err("durationMin"), t("form.durationHint"))}
              type="number"
              inputMode="numeric"
              min={5}
              step={5}
              value={Number.isFinite(values.durationMin) ? values.durationMin : ""}
              onChange={(e) =>
                update({ durationMin: e.target.value === "" ? 0 : Math.trunc(Number(e.target.value)) })
              }
              className={cn(err("durationMin") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Assigned to */}
          <FormField htmlFor="assignedMemberId" label={t("form.assignedTo")} full hint={t("form.assignedHint")}>
            <Select
              value={values.assignedMemberId || "unassigned"}
              onValueChange={(v) => update({ assignedMemberId: v === "unassigned" ? "" : v })}
            >
              <SelectTrigger id="assignedMemberId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{t("form.unassigned")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({firstName(m.name)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{t("form.requiredNote")}</p>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || success}>
              {t("form.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || success} className="min-w-[10rem]">
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
                <span>{mode === "edit" ? t("form.saveChanges") : t("form.saveAppointment")}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
