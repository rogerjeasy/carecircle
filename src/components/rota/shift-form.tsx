"use client";

import * as React from "react";
import { Check, Loader2, Phone, User } from "lucide-react";
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
import { FormField } from "./form-field";
import { DAY_FULL, MEMBERS } from "./data";
import { firstName } from "./utils";
import type { Shift, ShiftType } from "./types";

export interface ShiftFormValues {
  memberId: string;
  dayIndex: string; // "0".."6"
  start: string;
  end: string;
  type: ShiftType;
}

export function emptyShiftValues(dayIndex: number): ShiftFormValues {
  return { memberId: "", dayIndex: String(dayIndex), start: "09:00", end: "17:00", type: "in-person" };
}

export function valuesToShift(values: ShiftFormValues, id: string): Shift {
  return {
    id,
    memberId: values.memberId,
    dayIndex: Number(values.dayIndex),
    start: values.start,
    end: values.end,
    type: values.type,
  };
}

type Errors = Partial<Record<keyof ShiftFormValues, string>>;

function validate(v: ShiftFormValues): { ok: boolean; errors: Errors } {
  const errors: Errors = {};
  if (!v.memberId) errors.memberId = "Choose a member";
  if (!v.start) errors.start = "Pick a start time";
  if (!v.end) errors.end = "Pick an end time";
  if (v.start && v.end && v.start === v.end) errors.end = "End can't equal start";
  return { ok: Object.keys(errors).length === 0, errors };
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface ShiftFormProps {
  initialValues: ShiftFormValues;
  onSubmit: (values: ShiftFormValues) => void;
  onCancel: () => void;
}

/** The Add-shift form. Scrolls internally with a sticky footer; hosted in a modal. */
export function ShiftForm({ initialValues, onSubmit, onCancel }: ShiftFormProps) {
  const [values, setValues] = React.useState<ShiftFormValues>(initialValues);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const update = (patch: Partial<ShiftFormValues>) => setValues((v) => ({ ...v, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;
    const { ok, errors: next } = validate(values);
    setErrors(next);
    if (!ok) return;
    setSubmitting(true);
    await delay(600);
    onSubmit(values);
    setSubmitting(false);
    setSuccess(true);
    await delay(500);
    onCancel();
  };

  const overnight = values.start && values.end && values.start >= values.end;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Member */}
          <FormField htmlFor="memberId" label="Member" required full error={errors.memberId}>
            <Select value={values.memberId} onValueChange={(v) => update({ memberId: v })}>
              <SelectTrigger
                id="memberId"
                aria-invalid={errors.memberId ? true : undefined}
                className={cn(errors.memberId && "border-destructive focus:ring-destructive")}
              >
                <SelectValue placeholder="Who's on?" />
              </SelectTrigger>
              <SelectContent>
                {MEMBERS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({firstName(m.name)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Day */}
          <FormField htmlFor="dayIndex" label="Day" full>
            <Select value={values.dayIndex} onValueChange={(v) => update({ dayIndex: v })}>
              <SelectTrigger id="dayIndex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_FULL.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Start */}
          <FormField htmlFor="start" label="From" required error={errors.start}>
            <Input
              id="start"
              type="time"
              value={values.start}
              onChange={(e) => update({ start: e.target.value })}
              className={cn(errors.start && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* End */}
          <FormField
            htmlFor="end"
            label="To"
            required
            hint={overnight ? "Runs overnight into the next day" : undefined}
            error={errors.end}
          >
            <Input
              id="end"
              type="time"
              value={values.end}
              onChange={(e) => update({ end: e.target.value })}
              className={cn(errors.end && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Type */}
          <FormField htmlFor="type" label="Type" full>
            <div id="type" className="grid grid-cols-2 gap-2">
              <TypeButton
                active={values.type === "in-person"}
                onClick={() => update({ type: "in-person" })}
                icon={User}
                label="In person"
              />
              <TypeButton
                active={values.type === "on-call"}
                onClick={() => update({ type: "on-call" })}
                icon={Phone}
                label="On call"
              />
            </div>
          </FormField>
        </div>
      </div>

      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || success}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || success} className="min-w-[8.5rem]">
            {success ? (
              <>
                <Check className="h-4 w-4" />
                <span className="ml-1">Added</span>
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                <span className="ml-1">Adding…</span>
              </>
            ) : (
              <span>Add shift</span>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function TypeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof User;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
