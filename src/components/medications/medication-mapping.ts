// Maps the rich form values back onto the lightweight Medication used by the list/grid.

import type { MedFormValues } from "./schema";
import type { Medication } from "./types";

/** "08:00" → "8:00am". */
export function to12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")}${period}`;
}

/** Human-readable schedule summary, e.g. "Twice daily · 8:00am, 8:00pm" or "As needed". */
export function scheduleSummary(values: MedFormValues): string {
  if (values.isPrn) return "As needed";
  if (values.schedules.length === 0) return "Schedule not set";
  const times = values.schedules.map((r) => to12h(r.time));
  const freq =
    times.length === 1 ? "Once daily" : times.length === 2 ? "Twice daily" : `${times.length}× daily`;
  return `${freq} · ${times.join(", ")}`;
}

/** Build (or update) a Medication from validated form values. */
export function valuesToMedication(values: MedFormValues, id: string, existing?: Medication): Medication {
  return {
    id: existing?.id ?? id,
    name: values.name.trim(),
    strength: values.strength.trim() || "—",
    form: values.form || "Tablet",
    purpose: values.purpose.trim() || "—",
    schedule: scheduleSummary(values),
    prescriber: values.prescriber.trim() || "Unknown",
    supplyDays: values.supplyCount,
    active: existing?.active ?? true,
    discontinued: existing?.discontinued,
    discontinuedNote: existing?.discontinuedNote,
  };
}
