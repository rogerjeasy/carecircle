// Form schema for the Add / Edit appointment form.

import { z } from "zod";
import { format } from "date-fns";
import type { AppointmentKind, AppointmentStatus } from "./types";

export interface AppointmentFormValues {
  title: string;
  kind: AppointmentKind;
  provider: string;
  location: string;
  /** "yyyy-MM-dd" (from <input type="date">). */
  date: string;
  /** "HH:mm" (from <input type="time">). */
  time: string;
  durationMin: number;
  /** Member id, or "" for unassigned. */
  assignedMemberId: string;
  status: AppointmentStatus;
}

/** Localized validation messages — passed in as plain strings (see `form.errors.*`). */
export interface AppointmentFormMessages {
  title: string;
  kind: string;
  provider: string;
  location: string;
  date: string;
  time: string;
  durationNumber: string;
  durationInt: string;
  durationMin: string;
  durationMax: string;
}

/** Build the zod schema with localized messages (the medications-form pattern). */
export function buildAppointmentFormSchema(m: AppointmentFormMessages) {
  return z.object({
    title: z.string().trim().min(1, m.title),
    kind: z.string().min(1, m.kind),
    provider: z.string().trim().min(1, m.provider),
    location: z.string().trim().max(120, m.location).optional().or(z.literal("")),
    date: z.string().min(1, m.date),
    time: z.string().min(1, m.time),
    durationMin: z
      .number({ message: m.durationNumber })
      .int(m.durationInt)
      .min(5, m.durationMin)
      .max(480, m.durationMax),
    assignedMemberId: z.string(),
    status: z.string().min(1),
  });
}

export type AppointmentFormSchema = ReturnType<typeof buildAppointmentFormSchema>;
export type AppointmentFormErrors = Record<string, string>;

/** Validate against a prebuilt schema, returning a flat `{ field: message }` map for inline display. */
export function validateAppointmentForm(
  values: AppointmentFormValues,
  schema: AppointmentFormSchema
): { ok: boolean; errors: AppointmentFormErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, errors: {} };
  const errors: AppointmentFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Build empty form values for "Add", defaulting the date to the chosen calendar day. */
export function emptyValues(defaultDate: Date): AppointmentFormValues {
  return {
    title: "",
    kind: "checkup",
    provider: "",
    location: "",
    date: format(defaultDate, "yyyy-MM-dd"),
    time: "09:00",
    durationMin: 30,
    assignedMemberId: "",
    status: "scheduled",
  };
}
