"use client";

import { useTranslations } from "next-intl";
import { Check, Eye, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { roleMeta, statusMeta } from "./utils";
import type { Access, CircleRole, MemberStatus } from "./types";

export function RoleBadge({ role, className }: { role: CircleRole; className?: string }) {
  const t = useTranslations("people");
  const m = roleMeta[role];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", m.tint, className)}>
      {t(`roles.${role}.label` as "roles.coordinator.label")}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: MemberStatus; className?: string }) {
  const t = useTranslations("people");
  const m = statusMeta[status];
  return (
    <Badge variant={m.variant} className={cn("gap-1.5", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} aria-hidden="true" />
      {t(`status.${status}` as "status.active")}
    </Badge>
  );
}

const accessMeta: Record<Access, { icon: typeof Check; className: string }> = {
  edit: { icon: Check, className: "text-success" },
  view: { icon: Eye, className: "text-info" },
  none: { icon: Minus, className: "text-muted-foreground/50" },
};

/** A matrix cell / inline access indicator (icon + label). */
export function AccessCell({ access, compact = false }: { access: Access; compact?: boolean }) {
  const t = useTranslations("people");
  const m = accessMeta[access];
  const Icon = m.icon;
  const label = t(`access.${access}` as "access.edit");
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", m.className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {!compact && label}
      {compact && <span className="sr-only">{label}</span>}
    </span>
  );
}
