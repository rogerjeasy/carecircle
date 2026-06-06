"use client";

import { ResponsiveModal } from "./responsive-modal";
import { AppointmentForm } from "./appointment-form";
import type { AppointmentFormValues } from "./schema";
import type { Appointment } from "./types";

export interface AppointmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial?: Appointment;
  defaultDate: Date;
  onSubmit: (values: AppointmentFormValues) => void;
}

/** Add / Edit appointment, in a Dialog on tablet+ and a bottom Sheet on phone. */
export function AppointmentFormModal({
  open,
  onOpenChange,
  mode,
  initial,
  defaultDate,
  onSubmit,
}: AppointmentFormModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit appointment" : "Add appointment"}
      description={
        mode === "edit"
          ? "Update the details, time, and who's taking them."
          : "Schedule a visit and assign who's taking them."
      }
    >
      <AppointmentForm
        mode={mode}
        initial={initial}
        defaultDate={defaultDate}
        onSubmit={onSubmit}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveModal>
  );
}
