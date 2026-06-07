"use client";

import * as React from "react";
import { Siren } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ReportIncidentModal } from "./report-incident-modal";

export interface ReportIncidentButtonProps {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /** Icon-only (e.g. the global top-bar trigger). */
  iconOnly?: boolean;
  label?: string;
  onReported?: (id: string) => void;
}

/** A self-contained trigger that opens the report flow — drop it anywhere (global, dashboard, etc.). */
export function ReportIncidentButton({
  variant = "default",
  size = "default",
  className,
  iconOnly = false,
  label = "Report incident",
  onReported,
}: ReportIncidentButtonProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? label : undefined}
      >
        <Siren className="h-4 w-4" />
        {!iconOnly && (
          <>
            <span className="ml-1 hidden sm:inline">{label}</span>
            <span className="ml-1 sm:hidden">{label.split(" ")[0]}</span>
          </>
        )}
      </Button>
      {open && <ReportIncidentModal open onOpenChange={setOpen} onReported={onReported} />}
    </>
  );
}
