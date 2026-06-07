"use client";

import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { StatusLevel } from "./types";

const meta: Record<StatusLevel, { label: string; variant: "success" | "warning" | "info"; icon: typeof Check }> = {
  normal: { label: "Normal", variant: "success", icon: Check },
  elevated: { label: "Elevated", variant: "warning", icon: ArrowUp },
  low: { label: "Low", variant: "info", icon: ArrowDown },
};

/** A status pill: icon + text + colour (normal / elevated / low). */
export function StatusPill({ status, className }: { status: StatusLevel; className?: string }) {
  const m = meta[status];
  const Icon = m.icon;
  return (
    <Badge variant={m.variant} className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {m.label}
    </Badge>
  );
}
