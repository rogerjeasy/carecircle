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
import { NameAutocomplete } from "./name-autocomplete";
import { PhotoUpload } from "./photo-upload";
import { MedAttachments } from "./medication-attachments";
import { ScheduleBuilder } from "./schedule-builder";
import { SafetyCheckPanel } from "./safety-check-panel";
import { checkMedicationSafety } from "./safety";
import {
  EVERY_DAY,
  MED_FORMS,
  MED_ROUTES,
  buildMedFormSchema,
  validateMedForm,
  type MedFormErrors,
  type MedFormMessages,
  type MedFormValues,
} from "./schema";
import type { MedAttachment, Medication } from "./types";

export interface MedicationFormProps {
  mode: "add" | "edit";
  initial?: Medication;
  /** Active medications used for the interaction check (already excludes the med being edited). */
  currentMedNames: string[];
  /** The recipient's recorded allergies (real data from their profile) for the allergy check. */
  allergies: string[];
  /** Saved attachments to show (edit mode). */
  existingAttachments?: MedAttachment[];
  /** Remove a saved attachment (edit mode). */
  onRemoveAttachment?: (id: string) => void;
  /** Receives the form values plus any newly-chosen files to upload after the medication saves. */
  onSubmit: (values: MedFormValues, pendingFiles: File[]) => void;
  onCancel: () => void;
}

function medicationToValues(med?: Medication): MedFormValues {
  if (!med) {
    return {
      name: "",
      strength: "",
      form: "",
      route: "",
      purpose: "",
      prescriber: "",
      instructions: "",
      photoUrl: null,
      isPrn: false,
      schedules: [{ id: "row-0", time: "08:00", days: [...EVERY_DAY] }],
      supplyCount: 30,
      refillThreshold: 7,
    };
  }
  // Prefer the real, structured fields the server provides; fall back to safe defaults for
  // demo/optimistic-only rows that don't carry them (so the form still opens cleanly).
  const isPrn = med.isPrn ?? /as needed|prn/i.test(med.schedule);
  const rows = med.scheduleRows ?? [];
  const schedules = isPrn
    ? []
    : rows.length > 0
      ? rows.map((r, i) => ({ id: `row-${i}`, time: r.time, days: [...r.days] }))
      : [{ id: "row-0", time: "08:00", days: [...EVERY_DAY] }];
  return {
    name: med.name,
    strength: med.strength,
    form: med.form || "Tablet",
    route: med.route || "Oral",
    purpose: med.purpose,
    prescriber: med.prescriber,
    instructions: med.instructions ?? "",
    // Show the current pill photo (a resolved https URL). It's only re-uploaded when the user
    // picks a NEW file (a data: URL); an unchanged https value is left as-is by the action.
    photoUrl: med.photoUrl ?? null,
    isPrn,
    schedules,
    supplyCount: med.supplyDays,
    refillThreshold: med.refillThreshold ?? 7,
  };
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function MedicationForm({
  mode,
  initial,
  currentMedNames,
  allergies,
  existingAttachments = [],
  onRemoveAttachment,
  onSubmit,
  onCancel,
}: MedicationFormProps) {
  const t = useTranslations("medications.form");
  const tErr = useTranslations("medications.form.errors");

  // Localized validation schema — rebuilt only when the error messages change (i.e. on locale
  // change). Each message is a literal `tErr("…")` call so the keys stay type-checked.
  const schema = React.useMemo(() => {
    const messages: MedFormMessages = {
      nameRequired: tErr("nameRequired"),
      strengthRequired: tErr("strengthRequired"),
      selectForm: tErr("selectForm"),
      selectRoute: tErr("selectRoute"),
      purposeMax: tErr("purposeMax"),
      prescriberMax: tErr("prescriberMax"),
      instructionsMax: tErr("instructionsMax"),
      enterNumber: tErr("enterNumber"),
      wholeNumber: tErr("wholeNumber"),
      cannotBeNegative: tErr("cannotBeNegative"),
      supplyTooHigh: tErr("supplyTooHigh"),
      refillTooHigh: tErr("refillTooHigh"),
      pickTime: tErr("pickTime"),
      pickDay: tErr("pickDay"),
      addDoseTime: tErr("addDoseTime"),
    };
    return buildMedFormSchema(messages);
  }, [tErr]);

  const [values, setValues] = React.useState<MedFormValues>(() => medicationToValues(initial));
  const [errors, setErrors] = React.useState<MedFormErrors>({});
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  // Local copy so removing a saved attachment updates the form immediately while it persists.
  const [savedAttachments, setSavedAttachments] = React.useState<MedAttachment[]>(existingAttachments);
  // The warning signature the user has acknowledged (null = none). Deriving acknowledgement from
  // this means a change to the warnings automatically invalidates a stale acknowledgement.
  const [ackedSig, setAckedSig] = React.useState<string | null>(null);
  const [triedSave, setTriedSave] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Monotonic id source for new schedule rows (deterministic — no Date.now/random).
  const idRef = React.useRef(1);
  const makeId = React.useCallback(() => `row-${idRef.current++}`, []);

  const update = React.useCallback((patch: Partial<MedFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
  }, []);

  // Reactive safety check, recomputed as the name (or current meds) changes.
  const warnings = React.useMemo(
    () => checkMedicationSafety(values.name, { currentMedNames, allergies }),
    [values.name, currentMedNames, allergies]
  );
  const warningSig = warnings.map((w) => w.id).join("|");
  const acknowledged = warnings.length > 0 && ackedSig === warningSig;

  const setFieldError = (key: string) => (errors[key] ? errors[key] : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;
    setTriedSave(true);

    const { ok, errors: nextErrors } = validateMedForm(values, schema);
    setErrors(nextErrors);
    if (!ok) {
      const firstKey = Object.keys(nextErrors)[0];
      const el = firstKey ? document.getElementById(firstKey) : null;
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    if (warnings.length > 0 && !acknowledged) {
      document
        .getElementById("safety-check-anchor")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    onSubmit(values, pendingFiles);
    setSubmitting(false);
    setSuccess(true);
    await delay(650);
    onCancel();
  };

  const needsAck = warnings.length > 0 && !acknowledged;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name (autocomplete) */}
          <FormField htmlFor="name" label={t("fields.name.label")} required full error={setFieldError("name")}>
            <NameAutocomplete
              id="name"
              value={values.name}
              placeholder={t("nameInput.placeholder")}
              onChange={(name) => update({ name })}
              onSelectSuggestion={(s) =>
                update({
                  name: s.name,
                  form: values.form || s.form || "",
                  route: values.route || s.route || "",
                  purpose: values.purpose || s.purpose || "",
                })
              }
              error={setFieldError("name")}
              invalid={Boolean(setFieldError("name"))}
              describedBy={setFieldError("name") ? "name-error" : undefined}
            />
          </FormField>

          {/* Strength */}
          <FormField htmlFor="strength" label={t("fields.strength.label")} required error={setFieldError("strength")}>
            <Input
              {...fieldAria("strength", setFieldError("strength"))}
              value={values.strength}
              onChange={(e) => update({ strength: e.target.value })}
              placeholder={t("fields.strength.placeholder")}
              className={cn(setFieldError("strength") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Form */}
          <FormField htmlFor="form" label={t("fields.form.label")} required error={setFieldError("form")}>
            <Select value={values.form} onValueChange={(v) => update({ form: v })}>
              <SelectTrigger
                id="form"
                aria-invalid={setFieldError("form") ? true : undefined}
                aria-describedby={setFieldError("form") ? "form-error" : undefined}
                className={cn(setFieldError("form") && "border-destructive focus:ring-destructive")}
              >
                <SelectValue placeholder={t("fields.form.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {MED_FORMS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {t(`forms.${f}` as "forms.Tablet")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Route */}
          <FormField htmlFor="route" label={t("fields.route.label")} required error={setFieldError("route")}>
            <Select value={values.route} onValueChange={(v) => update({ route: v })}>
              <SelectTrigger
                id="route"
                aria-invalid={setFieldError("route") ? true : undefined}
                aria-describedby={setFieldError("route") ? "route-error" : undefined}
                className={cn(setFieldError("route") && "border-destructive focus:ring-destructive")}
              >
                <SelectValue placeholder={t("fields.route.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {MED_ROUTES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`routes.${r}` as "routes.Oral")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Purpose */}
          <FormField htmlFor="purpose" label={t("fields.purpose.label")} hint={t("fields.purpose.hint")} error={setFieldError("purpose")}>
            <Input
              {...fieldAria("purpose", setFieldError("purpose"), t("fields.purpose.hint"))}
              value={values.purpose}
              onChange={(e) => update({ purpose: e.target.value })}
              placeholder={t("fields.purpose.placeholder")}
              className={cn(setFieldError("purpose") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Prescriber */}
          <FormField htmlFor="prescriber" label={t("fields.prescriber.label")} error={setFieldError("prescriber")}>
            <Input
              {...fieldAria("prescriber", setFieldError("prescriber"))}
              value={values.prescriber}
              onChange={(e) => update({ prescriber: e.target.value })}
              placeholder={t("fields.prescriber.placeholder")}
              className={cn(setFieldError("prescriber") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Instructions */}
          <FormField
            htmlFor="instructions"
            label={t("fields.instructions.label")}
            full
            hint={t("fields.instructions.hint")}
            error={setFieldError("instructions")}
          >
            <Textarea
              {...fieldAria("instructions", setFieldError("instructions"), t("fields.instructions.ariaHint"))}
              value={values.instructions}
              onChange={(e) => update({ instructions: e.target.value })}
              placeholder={t("fields.instructions.placeholder")}
              className={cn(setFieldError("instructions") && "border-destructive focus-visible:ring-destructive")}
              rows={2}
            />
          </FormField>

          {/* Photo */}
          <FormField htmlFor="photo" label={t("fields.photo.label")} full hint={t("fields.photo.hint")}>
            <div id="photo">
              <PhotoUpload value={values.photoUrl} onChange={(photoUrl) => update({ photoUrl })} />
            </div>
          </FormField>

          {/* Attachments (extra images + documents) */}
          <FormField
            htmlFor="attachments"
            label={t("fields.attachments.label")}
            full
            hint={t("fields.attachments.hint")}
          >
            <div id="attachments">
              <MedAttachments
                pending={pendingFiles}
                onPendingChange={setPendingFiles}
                existing={savedAttachments}
                onRemoveExisting={
                  onRemoveAttachment
                    ? (id) => {
                        setSavedAttachments((prev) => prev.filter((a) => a.id !== id));
                        onRemoveAttachment(id);
                      }
                    : undefined
                }
              />
            </div>
          </FormField>

          {/* Schedule builder */}
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <p className="text-sm font-medium leading-none">{t("fields.schedule.label")}</p>
            <ScheduleBuilder
              isPrn={values.isPrn}
              onPrnChange={(isPrn) => update({ isPrn })}
              schedules={values.schedules}
              onChange={(schedules) => update({ schedules })}
              errors={errors}
              makeId={makeId}
            />
          </div>

          {/* Supply + refill threshold */}
          <FormField
            htmlFor="supplyCount"
            label={t("fields.supplyCount.label")}
            hint={t("fields.supplyCount.hint")}
            error={setFieldError("supplyCount")}
          >
            <Input
              {...fieldAria("supplyCount", setFieldError("supplyCount"), t("fields.supplyCount.aria"))}
              type="number"
              inputMode="numeric"
              min={0}
              value={Number.isFinite(values.supplyCount) ? values.supplyCount : ""}
              onChange={(e) => update({ supplyCount: e.target.value === "" ? 0 : Math.trunc(Number(e.target.value)) })}
              className={cn(setFieldError("supplyCount") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          <FormField
            htmlFor="refillThreshold"
            label={t("fields.refillThreshold.label")}
            hint={t("fields.refillThreshold.hint")}
            error={setFieldError("refillThreshold")}
          >
            <Input
              {...fieldAria("refillThreshold", setFieldError("refillThreshold"), t("fields.refillThreshold.aria"))}
              type="number"
              inputMode="numeric"
              min={0}
              value={Number.isFinite(values.refillThreshold) ? values.refillThreshold : ""}
              onChange={(e) =>
                update({ refillThreshold: e.target.value === "" ? 0 : Math.trunc(Number(e.target.value)) })
              }
              className={cn(setFieldError("refillThreshold") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Safety check */}
          <div id="safety-check-anchor" className="min-w-0 scroll-mt-4 sm:col-span-2">
            <SafetyCheckPanel
              warnings={warnings}
              acknowledged={acknowledged}
              onAcknowledgeChange={(v) => setAckedSig(v ? warningSig : null)}
              showAckError={triedSave}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:max-w-[18rem]">
            {needsAck ? t("footer.ackToContinue") : t("footer.requiredHint")}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || success}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || success} className="min-w-[9.5rem]">
              {success ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="ml-1">{t("actions.saved")}</span>
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                  <span className="ml-1">{t("actions.saving")}</span>
                </>
              ) : (
                <span>{mode === "edit" ? t("actions.saveChanges") : t("actions.saveMedication")}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
