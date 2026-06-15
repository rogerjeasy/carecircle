"use client";

import { useTranslations } from "next-intl";
import { ResponsiveModal } from "./responsive-modal";
import { LogReadingForm, type LogValues } from "./log-reading-form";
import type { ThresholdMap } from "./types";

export interface LogReadingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: LogValues;
  onSubmit: (values: LogValues) => void;
  /** The circle's alert ranges, for the live "would be flagged" preview. */
  thresholds?: ThresholdMap;
}

/** Log a reading, in a centered Dialog on tablet+ and a full-height Sheet on phone. */
export function LogReadingModal({ open, onOpenChange, initialValues, onSubmit, thresholds }: LogReadingModalProps) {
  const t = useTranslations("health");
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("log.modalTitle")}
      description={t("log.modalDesc")}
    >
      <LogReadingForm
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={() => onOpenChange(false)}
        thresholds={thresholds}
      />
    </ResponsiveModal>
  );
}
