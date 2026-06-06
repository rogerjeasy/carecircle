"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { statusMeta } from "./data";
import type { AppointmentStatus } from "./types";

/** A small status pill (Scheduled / Confirmed / Needs prep / Completed / Cancelled). */
export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <Badge
      variant={meta.variant}
      className={cn("gap-1.5", status === "cancelled" && "text-muted-foreground", className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
