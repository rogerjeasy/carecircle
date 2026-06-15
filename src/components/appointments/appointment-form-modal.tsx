"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("appointments");
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? t("form.modalEditTitle") : t("form.modalAddTitle")}
      description={mode === "edit" ? t("form.modalEditDesc") : t("form.modalAddDesc")}
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
