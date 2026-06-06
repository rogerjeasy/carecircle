"use client";

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
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add shift"
      description="Set who's on, the day, the hours, and whether they're in person or on call."
    >
      <ShiftForm initialValues={initialValues} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
    </ResponsiveModal>
  );
}
