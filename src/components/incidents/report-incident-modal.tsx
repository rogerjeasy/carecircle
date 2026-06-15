"use client";

import { useTranslations } from "next-intl";
import { ResponsiveModal } from "./responsive-modal";
import { ReportIncidentFlow } from "./report-incident-flow";

export interface ReportIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported?: (id: string) => void;
}

/** Report-an-incident, in a centered Dialog on tablet+ and a full-height Sheet on phone. */
export function ReportIncidentModal({ open, onOpenChange, onReported }: ReportIncidentModalProps) {
  const t = useTranslations("incidents");
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("modal.title")}
      description={t("modal.description")}
    >
      <ReportIncidentFlow onClose={() => onOpenChange(false)} onReported={onReported} />
    </ResponsiveModal>
  );
}
