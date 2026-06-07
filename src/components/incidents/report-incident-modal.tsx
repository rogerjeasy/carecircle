"use client";

import { ResponsiveModal } from "./responsive-modal";
import { ReportIncidentFlow } from "./report-incident-flow";

export interface ReportIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReported?: (id: string) => void;
}

/** Report-an-incident, in a centered Dialog on tablet+ and a full-height Sheet on phone. */
export function ReportIncidentModal({ open, onOpenChange, onReported }: ReportIncidentModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Report an incident"
      description="Let the circle know what happened — calmly and quickly."
    >
      <ReportIncidentFlow onClose={() => onOpenChange(false)} onReported={onReported} />
    </ResponsiveModal>
  );
}
