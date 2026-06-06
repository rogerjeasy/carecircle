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

export const appointmentFormSchema = z.object({
  title: z.string().trim().min(1, "Give the appointment a title"),
  kind: z.string().min(1, "Choose a type"),
  provider: z.string().trim().min(1, "Who is the provider?"),
  location: z.string().trim().max(120, "Keep this under 120 characters").optional().or(z.literal("")),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  durationMin: z
    .number({ message: "Enter a number" })
    .int("Use whole minutes")
    .min(5, "At least 5 minutes")
    .max(480, "That seems too long"),
  assignedMemberId: z.string(),
  status: z.string().min(1),
});

export type AppointmentFormErrors = Record<string, string>;

/** Validate, returning a flat `{ field: message }` map for inline display. */
export function validateAppointmentForm(values: AppointmentFormValues): {
  ok: boolean;
  errors: AppointmentFormErrors;
} {
  const result = appointmentFormSchema.safeParse(values);
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
