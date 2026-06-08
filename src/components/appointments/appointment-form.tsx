"use client";

import * as React from "react";
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
import { APPOINTMENT_KINDS, statusMeta } from "./data";
import { useApptMembers } from "./members-context";
import { firstName } from "./utils";
import {
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
  const { members } = useApptMembers();
  const [values, setValues] = React.useState<AppointmentFormValues>(() =>
    initial ? appointmentToValues(initial) : emptyValues(defaultDate)
  );
  const [errors, setErrors] = React.useState<AppointmentFormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const update = React.useCallback((patch: Partial<AppointmentFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
  }, []);

  const err = (key: string) => errors[key];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;

    const { ok, errors: nextErrors } = validateAppointmentForm(values);
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
          <FormField htmlFor="title" label="Title" required full error={err("title")}>
            <Input
              {...fieldAria("title", err("title"))}
              value={values.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g. Cardiology follow-up"
              className={cn(err("title") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Type */}
          <FormField htmlFor="kind" label="Type" required error={err("kind")}>
            <Select value={values.kind} onValueChange={(v) => update({ kind: v as AppointmentKind })}>
              <SelectTrigger id="kind">
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Status */}
          <FormField htmlFor="status" label="Status" error={err("status")}>
            <Select value={values.status} onValueChange={(v) => update({ status: v as AppointmentStatus })}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusMeta[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Provider */}
          <FormField htmlFor="provider" label="Provider" required error={err("provider")}>
            <Input
              {...fieldAria("provider", err("provider"))}
              value={values.provider}
              onChange={(e) => update({ provider: e.target.value })}
              placeholder="e.g. Dr. Chen"
              className={cn(err("provider") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Location */}
          <FormField htmlFor="location" label="Location" error={err("location")}>
            <Input
              {...fieldAria("location", err("location"))}
              value={values.location}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="e.g. City Heart Clinic · Suite 4"
              className={cn(err("location") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Date */}
          <FormField htmlFor="date" label="Date" required error={err("date")}>
            <Input
              {...fieldAria("date", err("date"))}
              type="date"
              value={values.date}
              onChange={(e) => update({ date: e.target.value })}
              className={cn(err("date") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Time */}
          <FormField htmlFor="time" label="Time" required error={err("time")}>
            <Input
              {...fieldAria("time", err("time"))}
              type="time"
              value={values.time}
              onChange={(e) => update({ time: e.target.value })}
              className={cn(err("time") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Duration */}
          <FormField htmlFor="durationMin" label="Duration" hint="Minutes" error={err("durationMin")}>
            <Input
              {...fieldAria("durationMin", err("durationMin"), "Minutes")}
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
          <FormField htmlFor="assignedMemberId" label="Assigned to" full hint="Who is taking them?">
            <Select
              value={values.assignedMemberId || "unassigned"}
              onValueChange={(v) => update({ assignedMemberId: v === "unassigned" ? "" : v })}
            >
              <SelectTrigger id="assignedMemberId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
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
          <p className="text-xs text-muted-foreground">Required fields are marked with *</p>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || success}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || success} className="min-w-[10rem]">
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
                <span>{mode === "edit" ? "Save changes" : "Save appointment"}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
