"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("appointments");
  const meta = statusMeta[status];
  return (
    <Badge
      variant={meta.variant}
      className={cn("gap-1.5", status === "cancelled" && "text-muted-foreground", className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {t(`status.${status}` as "status.scheduled")}
    </Badge>
  );
}
