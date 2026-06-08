"use client";

import * as React from "react";
import { format } from "date-fns";
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
import { DEFAULT_THRESHOLDS, METRIC_ORDER, metricConfigs, metricIcons, MOOD_FACES } from "./data";
import { useHealthMembers } from "./members-context";
import { firstName, statusOf } from "./utils";
import type { MetricKey, Reading } from "./types";

export interface LogValues {
  metric: MetricKey;
  systolic: string;
  diastolic: string;
  value: string;
  weightUnit: "kg" | "lb";
  mood: number;
  date: string;
  time: string;
  note: string;
  recordedBy: string;
}

export function defaultLogValues(now: Date, metric: MetricKey = "bp", recordedBy = ""): LogValues {
  return {
    metric,
    systolic: "",
    diastolic: "",
    value: "",
    weightUnit: "kg",
    mood: 4,
    date: format(now, "yyyy-MM-dd"),
    time: format(now, "HH:mm"),
    note: "",
    recordedBy,
  };
}

type Errors = Partial<Record<keyof LogValues, string>>;

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

function validate(v: LogValues): Errors {
  const e: Errors = {};
  if (v.metric === "bp") {
    const s = num(v.systolic);
    const d = num(v.diastolic);
    if (!v.systolic) e.systolic = "Enter systolic";
    else if (Number.isNaN(s) || s < 70 || s > 260) e.systolic = "70–260 expected";
    if (!v.diastolic) e.diastolic = "Enter diastolic";
    else if (Number.isNaN(d) || d < 40 || d > 160) e.diastolic = "40–160 expected";
    if (!e.systolic && !e.diastolic && s <= d) e.diastolic = "Should be below systolic";
  } else if (v.metric === "mood") {
    if (v.mood < 1 || v.mood > 5) e.mood = "Pick a mood";
  } else {
    const n = num(v.value);
    const limits: Record<string, [number, number]> = {
      glucose: [30, 600],
      weight: v.weightUnit === "kg" ? [20, 300] : [44, 660],
      sleep: [0, 24],
      hr: [30, 220],
    };
    const [lo, hi] = limits[v.metric] ?? [0, 1e9];
    if (!v.value) e.value = "Enter a value";
    else if (Number.isNaN(n) || n < lo || n > hi) e.value = `${lo}–${hi} expected`;
  }
  if (!v.date) e.date = "Pick a date";
  if (!v.time) e.time = "Pick a time";
  if (!v.recordedBy) e.recordedBy = "Who recorded it?";
  return e;
}

/** Build a Reading from valid form values (weight normalised to kg). */
export function logValuesToReading(v: LogValues, id: string): Reading {
  const at = new Date(`${v.date}T${v.time}`);
  if (v.metric === "bp") {
    return { id, metric: "bp", at, value: num(v.systolic), secondary: num(v.diastolic), note: v.note.trim() || undefined, recordedBy: v.recordedBy };
  }
  if (v.metric === "mood") {
    return { id, metric: "mood", at, value: v.mood, note: v.note.trim() || undefined, recordedBy: v.recordedBy };
  }
  let value = num(v.value);
  if (v.metric === "weight" && v.weightUnit === "lb") value = Math.round(value * 0.453592 * 10) / 10;
  return { id, metric: v.metric, at, value, note: v.note.trim() || undefined, recordedBy: v.recordedBy };
}

/** Live status preview ("This would be flagged as elevated"). */
function previewStatus(v: LogValues) {
  const thr = DEFAULT_THRESHOLDS[v.metric];
  if (v.metric === "bp") {
    const s = num(v.systolic);
    const d = num(v.diastolic);
    if (Number.isNaN(s) || Number.isNaN(d)) return null;
    return statusOf("bp", s, d, thr);
  }
  if (v.metric === "mood") return statusOf("mood", v.mood, undefined, thr);
  const n = num(v.value);
  if (Number.isNaN(n)) return null;
  let value = n;
  if (v.metric === "weight" && v.weightUnit === "lb") value = value * 0.453592;
  return statusOf(v.metric, value, undefined, thr);
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface LogReadingFormProps {
  initialValues: LogValues;
  onSubmit: (values: LogValues) => void;
  onCancel: () => void;
}

/** The Log-reading form: pick a metric, fill the right inputs, with live friendly validation. */
export function LogReadingForm({ initialValues, onSubmit, onCancel }: LogReadingFormProps) {
  const { members } = useHealthMembers();
  const [values, setValues] = React.useState<LogValues>(initialValues);
  const [touched, setTouched] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const errors = validate(values);
  const valid = Object.keys(errors).length === 0;
  const update = (patch: Partial<LogValues>) => setValues((v) => ({ ...v, ...patch }));
  const showErr = (k: keyof LogValues) => (touched ? errors[k] : undefined);

  const cfg = metricConfigs[values.metric];
  const status = previewStatus(values);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || success) return;
    setTouched(true);
    if (!valid) return;
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
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {/* Metric segmented control */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Metric</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {METRIC_ORDER.map((m) => {
              const Icon = metricIcons[m];
              const active = values.metric === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ metric: m })}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="w-full truncate text-[11px] font-medium leading-tight">
                    {metricConfigs[m].name}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Dynamic inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {values.metric === "bp" && (
            <>
              <FormField htmlFor="systolic" label="Systolic" required error={showErr("systolic")}>
                <Input
                  {...fieldAria("systolic", showErr("systolic"))}
                  type="number"
                  inputMode="numeric"
                  value={values.systolic}
                  onChange={(e) => update({ systolic: e.target.value })}
                  onBlur={() => setTouched(true)}
                  placeholder="120"
                  className={cn(showErr("systolic") && "border-destructive focus-visible:ring-destructive")}
                />
              </FormField>
              <FormField htmlFor="diastolic" label="Diastolic" required error={showErr("diastolic")}>
                <Input
                  {...fieldAria("diastolic", showErr("diastolic"))}
                  type="number"
                  inputMode="numeric"
                  value={values.diastolic}
                  onChange={(e) => update({ diastolic: e.target.value })}
                  onBlur={() => setTouched(true)}
                  placeholder="80"
                  className={cn(showErr("diastolic") && "border-destructive focus-visible:ring-destructive")}
                />
              </FormField>
            </>
          )}

          {values.metric === "mood" && (
            <FormField htmlFor="mood" label="Mood" full error={showErr("mood")}>
              <div id="mood" className="flex flex-wrap gap-2">
                {MOOD_FACES.map((f) => {
                  const active = values.mood === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => update({ mood: f.value })}
                      aria-pressed={active}
                      aria-label={f.label}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      )}
                    >
                      <span className="text-2xl" aria-hidden="true">{f.emoji}</span>
                      <span className={cn("text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormField>
          )}

          {values.metric === "weight" && (
            <>
              <FormField htmlFor="value" label="Weight" required error={showErr("value")}>
                <Input
                  {...fieldAria("value", showErr("value"))}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={values.value}
                  onChange={(e) => update({ value: e.target.value })}
                  onBlur={() => setTouched(true)}
                  placeholder={values.weightUnit === "kg" ? "76.0" : "168"}
                  className={cn(showErr("value") && "border-destructive focus-visible:ring-destructive")}
                />
              </FormField>
              <FormField htmlFor="weightUnit" label="Unit">
                <Select value={values.weightUnit} onValueChange={(v) => update({ weightUnit: v as "kg" | "lb" })}>
                  <SelectTrigger id="weightUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </>
          )}

          {(values.metric === "glucose" || values.metric === "sleep" || values.metric === "hr") && (
            <FormField htmlFor="value" label={cfg.name} required hint={cfg.unit} error={showErr("value")}>
              <Input
                {...fieldAria("value", showErr("value"), cfg.unit)}
                type="number"
                inputMode="decimal"
                step={cfg.decimals > 0 ? "0.1" : "1"}
                value={values.value}
                onChange={(e) => update({ value: e.target.value })}
                onBlur={() => setTouched(true)}
                placeholder={cfg.name}
                className={cn(showErr("value") && "border-destructive focus-visible:ring-destructive")}
              />
            </FormField>
          )}

          {/* Live status preview */}
          {status && (
            <p
              className={cn(
                "sm:col-span-2 flex items-center gap-1.5 text-xs font-medium",
                status === "normal" ? "text-success" : status === "elevated" ? "text-warning" : "text-info"
              )}
              role="status"
            >
              {status === "normal"
                ? "Looks within the normal range."
                : `This would be flagged as ${status}.`}
            </p>
          )}

          {/* Date / time */}
          <FormField htmlFor="date" label="Date" required error={showErr("date")}>
            <Input
              {...fieldAria("date", showErr("date"))}
              type="date"
              value={values.date}
              onChange={(e) => update({ date: e.target.value })}
              className={cn(showErr("date") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>
          <FormField htmlFor="time" label="Time" required error={showErr("time")}>
            <Input
              {...fieldAria("time", showErr("time"))}
              type="time"
              value={values.time}
              onChange={(e) => update({ time: e.target.value })}
              className={cn(showErr("time") && "border-destructive focus-visible:ring-destructive")}
            />
          </FormField>

          {/* Recorded by */}
          <FormField htmlFor="recordedBy" label="Recorded by" error={showErr("recordedBy")}>
            <Select value={values.recordedBy} onValueChange={(v) => update({ recordedBy: v })}>
              <SelectTrigger id="recordedBy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {firstName(m.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Note */}
          <FormField htmlFor="note" label="Note" full hint="Optional">
            <Textarea
              id="note"
              value={values.note}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="Anything worth remembering about this reading…"
              rows={2}
            />
          </FormField>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting || success}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || success || (touched && !valid)} className="min-w-[9.5rem]">
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
              <span>Save reading</span>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
