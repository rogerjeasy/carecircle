"use client";

import { Check, Eye, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { roleMeta, statusMeta } from "./utils";
import type { Access, CircleRole, MemberStatus } from "./types";

export function RoleBadge({ role, className }: { role: CircleRole; className?: string }) {
  const m = roleMeta[role];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", m.tint, className)}>
      {m.label}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: MemberStatus; className?: string }) {
  const m = statusMeta[status];
  return (
    <Badge variant={m.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} aria-hidden="true" />
      {m.label}
    </Badge>
  );
}

const accessMeta: Record<Access, { label: string; icon: typeof Check; className: string }> = {
  edit: { label: "Full", icon: Check, className: "text-success" },
  view: { label: "View", icon: Eye, className: "text-info" },
  none: { label: "None", icon: Minus, className: "text-muted-foreground/50" },
};

/** A matrix cell / inline access indicator (icon + label). */
export function AccessCell({ access, compact = false }: { access: Access; compact?: boolean }) {
  const m = accessMeta[access];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", m.className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {!compact && m.label}
      {compact && <span className="sr-only">{m.label}</span>}
    </span>
  );
}
