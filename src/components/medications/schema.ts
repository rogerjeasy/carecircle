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

/**
 * Sun–Sat, indexed to match JS Date.getDay(). `key` indexes the
 * `medications.form.schedule.weekdayShort` / `weekdayFull` message maps (labels are localized in
 * the schedule builder; this array only holds the stable index + key).
 */
export const WEEKDAYS = [
  { index: 0, key: "sun" },
  { index: 1, key: "mon" },
  { index: 2, key: "tue" },
  { index: 3, key: "wed" },
  { index: 4, key: "thu" },
  { index: 5, key: "fri" },
  { index: 6, key: "sat" },
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

/**
 * Localized validation messages, resolved by the caller from the `medications.form.errors`
 * namespace. Passed as a plain object (not a translator) so the schema builder stays decoupled
 * from next-intl and every message is a literal `t("…")` call at the component boundary.
 */
export interface MedFormMessages {
  nameRequired: string;
  strengthRequired: string;
  selectForm: string;
  selectRoute: string;
  purposeMax: string;
  prescriberMax: string;
  instructionsMax: string;
  enterNumber: string;
  wholeNumber: string;
  cannotBeNegative: string;
  supplyTooHigh: string;
  refillTooHigh: string;
  pickTime: string;
  pickDay: string;
  addDoseTime: string;
}

/** Build the medication-form zod schema with localized validation messages. */
export function buildMedFormSchema(m: MedFormMessages) {
  const scheduleRowSchema = z.object({
    id: z.string(),
    time: z.string().min(1, m.pickTime),
    days: z.array(z.number()).min(1, m.pickDay),
  });

  return z
    .object({
      name: z.string().trim().min(1, m.nameRequired),
      strength: z.string().trim().min(1, m.strengthRequired),
      form: z.string().min(1, m.selectForm),
      route: z.string().min(1, m.selectRoute),
      purpose: z.string().trim().max(120, m.purposeMax).optional().or(z.literal("")),
      prescriber: z.string().trim().max(80, m.prescriberMax).optional().or(z.literal("")),
      instructions: z.string().trim().max(280, m.instructionsMax).optional().or(z.literal("")),
      photoUrl: z.string().nullable(),
      isPrn: z.boolean(),
      schedules: z.array(scheduleRowSchema),
      supplyCount: z
        .number({ message: m.enterNumber })
        .int(m.wholeNumber)
        .min(0, m.cannotBeNegative)
        .max(3650, m.supplyTooHigh),
      refillThreshold: z
        .number({ message: m.enterNumber })
        .int(m.wholeNumber)
        .min(0, m.cannotBeNegative)
        .max(365, m.refillTooHigh),
    })
    .superRefine((val, ctx) => {
      if (!val.isPrn) {
        if (val.schedules.length === 0) {
          ctx.addIssue({ code: "custom", path: ["schedules"], message: m.addDoseTime });
        }
        val.schedules.forEach((row, i) => {
          if (!row.time) {
            ctx.addIssue({ code: "custom", path: ["schedules", i, "time"], message: m.pickTime });
          }
          if (row.days.length === 0) {
            ctx.addIssue({ code: "custom", path: ["schedules", i, "days"], message: m.pickDay });
          }
        });
      }
    });
}

export type MedFormSchema = ReturnType<typeof buildMedFormSchema>;
export type MedFormErrors = Record<string, string>;

/** Validate form values against a (localized) schema, returning a flat `{ "path.to.field": message }` map. */
export function validateMedForm(values: MedFormValues, schema: MedFormSchema): { ok: boolean; errors: MedFormErrors } {
  const result = schema.safeParse(values);
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
