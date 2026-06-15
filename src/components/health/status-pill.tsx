"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { StatusLevel } from "./types";

const meta: Record<StatusLevel, { variant: "success" | "warning" | "info"; icon: typeof Check }> = {
  normal: { variant: "success", icon: Check },
  elevated: { variant: "warning", icon: ArrowUp },
  low: { variant: "info", icon: ArrowDown },
};

/** A status pill: icon + text + colour (normal / elevated / low). */
export function StatusPill({ status, className }: { status: StatusLevel; className?: string }) {
  const t = useTranslations("health");
  const m = meta[status];
  const Icon = m.icon;
  return (
    <Badge variant={m.variant} className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(`status.${status}` as "status.normal")}
    </Badge>
  );
}
