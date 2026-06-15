"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { useRotaMembers } from "./members-context";
import { firstName, weekdayLabel } from "./utils";
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

// Validation produces stable error KEYS; the component resolves them to localized copy via `t`.
type ErrorKey = "member" | "start" | "end" | "endEqualsStart";
type Errors = Partial<Record<keyof ShiftFormValues, ErrorKey>>;

function validate(v: ShiftFormValues): { ok: boolean; errors: Errors } {
  const errors: Errors = {};
  if (!v.memberId) errors.memberId = "member";
  if (!v.start) errors.start = "start";
  if (!v.end) errors.end = "end";
  if (v.start && v.end && v.start === v.end) errors.end = "endEqualsStart";
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
  const t = useTranslations("rota");
  const locale = useLocale();
  const { members } = useRotaMembers();
  const [values, setValues] = React.useState<ShiftFormValues>(initialValues);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Resolve validation error keys to localized copy (literal calls keep next-intl's typing happy).
  const errorText: Record<ErrorKey, string> = {
    member: t("form.errors.member"),
    start: t("form.errors.start"),
    end: t("form.errors.end"),
    endEqualsStart: t("form.errors.endEqualsStart"),
  };

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
          <FormField htmlFor="memberId" label={t("form.member")} required full error={errors.memberId && errorText[errors.memberId]}>
            <Select value={values.memberId} onValueChange={(v) => update({ memberId: v })}>
              <SelectTrigger
                id="memberId"
                aria-invalid={errors.memberId ? true : undefined}
                className={cn(errors.memberId && "border-destructive focus:ring-destructive")}
              >
                <SelectValue placeholder={t("form.memberPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({firstName(m.name)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Day */}
          <FormField htmlFor="dayIndex" label={t("form.day")} full>
            <Select value={values.dayIndex} onValueChange={(v) => update({ dayIndex: v })}>
              <SelectTrigger id="dayIndex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }).map((_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {weekdayLabel(locale, i, "long")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Start */}
          <FormField htmlFor="start" label={t("form.from")} required error={errors.start && errorText[errors.start]}>
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
            label={t("form.to")}
            required
            hint={overnight ? t("form.overnightHint") : undefined}
            error={errors.end && errorText[errors.end]}
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
          <FormField htmlFor="type" label={t("form.type")} full>
            <div id="type" className="grid grid-cols-2 gap-2">
              <TypeButton
                active={values.type === "in-person"}
                onClick={() => update({ type: "in-person" })}
                icon={User}
                label={t("form.inPerson")}
              />
              <TypeButton
                active={values.type === "on-call"}
                onClick={() => update({ type: "on-call" })}
                icon={Phone}
                label={t("form.onCall")}
              />
            </div>
          </FormField>
        </div>
      </div>

      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || success}>
            {t("form.cancel")}
          </Button>
          <Button type="submit" disabled={submitting || success} className="min-w-[8.5rem]">
            {success ? (
              <>
                <Check className="h-4 w-4" />
                <span className="ml-1">{t("form.added")}</span>
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                <span className="ml-1">{t("form.adding")}</span>
              </>
            ) : (
              <span>{t("form.submit")}</span>
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
