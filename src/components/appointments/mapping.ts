// Conversions between the Add/Edit form values and the `Appointment` domain object.

import { format, parse } from "date-fns";
import type { AppointmentFormValues } from "./schema";
import type { Appointment, AppointmentKind, AppointmentStatus } from "./types";

/** Form values → a full `Appointment`. On edit, prep/notes/summary are carried over from `prev`. */
export function valuesToAppointment(
  values: AppointmentFormValues,
  id: string,
  prev?: Appointment
): Appointment {
  const start = parse(`${values.date} ${values.time}`, "yyyy-MM-dd HH:mm", new Date());
  return {
    id,
    title: values.title.trim(),
    kind: values.kind as AppointmentKind,
    provider: values.provider.trim(),
    location: values.location.trim(),
    start,
    durationMin: values.durationMin,
    assignedMemberId: values.assignedMemberId || null,
    status: values.status as AppointmentStatus,
    notes: prev?.notes ?? "",
    prep: prev?.prep ?? [],
    visitSummary: prev?.visitSummary,
    postedToTimeline: prev?.postedToTimeline,
  };
}

/** An existing `Appointment` → editable form values. */
export function appointmentToValues(appt: Appointment): AppointmentFormValues {
  return {
    title: appt.title,
    kind: appt.kind,
    provider: appt.provider,
    location: appt.location,
    date: format(appt.start, "yyyy-MM-dd"),
    time: format(appt.start, "HH:mm"),
    durationMin: appt.durationMin,
    assignedMemberId: appt.assignedMemberId ?? "",
    status: appt.status,
  };
}
