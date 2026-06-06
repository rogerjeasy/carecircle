// Form schema, option lists, and a curated medication catalog for the Add / Edit form.

import { z } from "zod";

export const MED_FORMS = [
  "Tablet",
  "Capsule",
  "Liquid",
  "Injection",
  "Patch",
  "Inhaler",
  "Drops",
  "Cream",
  "Other",
] as const;

export const MED_ROUTES = [
  "Oral",
  "Sublingual",
  "Topical",
  "Inhaled",
  "Injection",
  "Ophthalmic",
  "Nasal",
  "Other",
] as const;

/** Sun–Sat, indexed to match JS Date.getDay(). */
export const WEEKDAYS = [
  { index: 0, label: "S", full: "Sunday" },
  { index: 1, label: "M", full: "Monday" },
  { index: 2, label: "T", full: "Tuesday" },
  { index: 3, label: "W", full: "Wednesday" },
  { index: 4, label: "T", full: "Thursday" },
  { index: 5, label: "F", full: "Friday" },
  { index: 6, label: "S", full: "Saturday" },
] as const;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];

export interface ScheduleRow {
  id: string;
  time: string; // "HH:mm" (24h, from <input type="time">)
  days: number[];
}

export interface MedFormValues {
  name: string;
  strength: string;
  form: string;
  route: string;
  purpose: string;
  prescriber: string;
  instructions: string;
  photoUrl: string | null;
  isPrn: boolean;
  schedules: ScheduleRow[];
  supplyCount: number;
  refillThreshold: number;
}

const scheduleRowSchema = z.object({
  id: z.string(),
  time: z.string().min(1, "Pick a time"),
  days: z.array(z.number()).min(1, "Pick at least one day"),
});

export const medFormSchema = z
  .object({
    name: z.string().trim().min(1, "Medication name is required"),
    strength: z.string().trim().min(1, "Strength is required (e.g. 10mg)"),
    form: z.string().min(1, "Select a form"),
    route: z.string().min(1, "Select a route"),
    purpose: z.string().trim().max(120, "Keep this under 120 characters").optional().or(z.literal("")),
    prescriber: z.string().trim().max(80, "Keep this under 80 characters").optional().or(z.literal("")),
    instructions: z.string().trim().max(280, "Keep instructions under 280 characters").optional().or(z.literal("")),
    photoUrl: z.string().nullable(),
    isPrn: z.boolean(),
    schedules: z.array(scheduleRowSchema),
    supplyCount: z
      .number({ message: "Enter a number" })
      .int("Use a whole number")
      .min(0, "Cannot be negative")
      .max(3650, "That seems too high"),
    refillThreshold: z
      .number({ message: "Enter a number" })
      .int("Use a whole number")
      .min(0, "Cannot be negative")
      .max(365, "That seems too high"),
  })
  .superRefine((val, ctx) => {
    if (!val.isPrn) {
      if (val.schedules.length === 0) {
        ctx.addIssue({ code: "custom", path: ["schedules"], message: "Add at least one dose time" });
      }
      val.schedules.forEach((row, i) => {
        if (!row.time) {
          ctx.addIssue({ code: "custom", path: ["schedules", i, "time"], message: "Pick a time" });
        }
        if (row.days.length === 0) {
          ctx.addIssue({ code: "custom", path: ["schedules", i, "days"], message: "Pick at least one day" });
        }
      });
    }
  });

export type MedFormErrors = Record<string, string>;

/** Validate form values, returning a flat `{ "path.to.field": message }` error map for inline display. */
export function validateMedForm(values: MedFormValues): { ok: boolean; errors: MedFormErrors } {
  const result = medFormSchema.safeParse(values);
  if (result.success) return { ok: true, errors: {} };
  const errors: MedFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Catalog used by the name autocomplete. Selecting a suggestion can pre-fill form/route/purpose. */
export interface MedSuggestion {
  name: string;
  form?: string;
  route?: string;
  purpose?: string;
}

export const MED_SUGGESTIONS: MedSuggestion[] = [
  { name: "Ibuprofen", form: "Tablet", route: "Oral", purpose: "Pain & inflammation" },
  { name: "Warfarin", form: "Tablet", route: "Oral", purpose: "Blood thinner" },
  { name: "Amoxicillin", form: "Capsule", route: "Oral", purpose: "Infection" },
  { name: "Lisinopril", form: "Tablet", route: "Oral", purpose: "Blood pressure" },
  { name: "Metformin", form: "Tablet", route: "Oral", purpose: "Blood sugar" },
  { name: "Atorvastatin", form: "Tablet", route: "Oral", purpose: "Cholesterol" },
  { name: "Aspirin", form: "Tablet", route: "Oral", purpose: "Heart" },
  { name: "Paracetamol", form: "Tablet", route: "Oral", purpose: "Pain & fever" },
  { name: "Omeprazole", form: "Capsule", route: "Oral", purpose: "Acid reflux" },
  { name: "Simvastatin", form: "Tablet", route: "Oral", purpose: "Cholesterol" },
  { name: "Clarithromycin", form: "Tablet", route: "Oral", purpose: "Infection" },
  { name: "Amlodipine", form: "Tablet", route: "Oral", purpose: "Blood pressure" },
  { name: "Furosemide", form: "Tablet", route: "Oral", purpose: "Fluid / heart" },
  { name: "Spironolactone", form: "Tablet", route: "Oral", purpose: "Fluid / heart" },
  { name: "Levothyroxine", form: "Tablet", route: "Oral", purpose: "Thyroid" },
  { name: "Sertraline", form: "Tablet", route: "Oral", purpose: "Mood" },
  { name: "Gabapentin", form: "Capsule", route: "Oral", purpose: "Nerve pain" },
  { name: "Prednisolone", form: "Tablet", route: "Oral", purpose: "Inflammation" },
  { name: "Donepezil", form: "Tablet", route: "Oral", purpose: "Memory" },
  { name: "Salbutamol", form: "Inhaler", route: "Inhaled", purpose: "Asthma / breathing" },
  { name: "Insulin glargine", form: "Injection", route: "Injection", purpose: "Blood sugar" },
  { name: "Vitamin D", form: "Capsule", route: "Oral", purpose: "Bone health" },
];
