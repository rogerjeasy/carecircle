"use client";

import { useTranslations } from "next-intl";
import { ResponsiveModal } from "./responsive-modal";
import { ShiftForm, type ShiftFormValues } from "./shift-form";

export interface ShiftFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: ShiftFormValues;
  onSubmit: (values: ShiftFormValues) => void;
}

/** Add a shift, in a Dialog on tablet+ and a bottom Sheet on phone. */
export function ShiftFormModal({ open, onOpenChange, initialValues, onSubmit }: ShiftFormModalProps) {
  const t = useTranslations("rota");
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("form.title")}
      description={t("form.description")}
    >
      <ShiftForm initialValues={initialValues} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
    </ResponsiveModal>
  );
}
