"use client";

import { ResponsiveModal } from "./responsive-modal";
import { LogReadingForm, type LogValues } from "./log-reading-form";

export interface LogReadingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: LogValues;
  onSubmit: (values: LogValues) => void;
}

/** Log a reading, in a centered Dialog on tablet+ and a full-height Sheet on phone. */
export function LogReadingModal({ open, onOpenChange, initialValues, onSubmit }: LogReadingModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Log a reading"
      description="Pick a metric and enter the latest values."
    >
      <LogReadingForm initialValues={initialValues} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
    </ResponsiveModal>
  );
}
