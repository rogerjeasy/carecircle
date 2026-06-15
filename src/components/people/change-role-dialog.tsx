"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveModal } from "./responsive-modal";
import { FormField } from "./form-field";
import { RoleBadge } from "./badges";
import { ROLES } from "./data";
import { firstName, roleChangePreview, type RoleChange } from "./utils";
import type { CircleRole, Member } from "./types";

export interface ChangeRoleDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (role: CircleRole) => void;
}

/** Confirm a role change with a live preview of exactly what access will change. */
export function ChangeRoleDialog({ member, open, onOpenChange, onConfirm }: ChangeRoleDialogProps) {
  const t = useTranslations("people");
  const [role, setRole] = React.useState<CircleRole>(member.role);
  const changes = React.useMemo(() => roleChangePreview(member.role, role), [member.role, role]);
  const gains = changes.filter((c) => c.direction === "gain");
  const losses = changes.filter((c) => c.direction === "loss");
  const changed = role !== member.role;
  const name = firstName(member.name);

  // Lowercased capability name for mid-sentence use (translators control casing per language).
  const capLower = (c: RoleChange) => t(`capabilitiesLower.${c.key}` as "capabilitiesLower.timeline");
  // The "loss" line, e.g. "Loses access to medical documents" / "Reduced to view access for …".
  const lossSentence = (c: RoleChange) =>
    c.to === "none"
      ? t("changeRole.lossNone", { cap: capLower(c) })
      : t("changeRole.lossView", { cap: capLower(c) });

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("changeRole.title")}
      description={t("changeRole.description", { name })}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {/* From → To */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <RoleBadge role={member.role} />
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <RoleBadge role={role} />
        </div>

        <FormField htmlFor="new-role" label={t("changeRole.newRole")}>
          <Select value={role} onValueChange={(v) => setRole(v as CircleRole)}>
            <SelectTrigger id="new-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem
                  key={r.key}
                  value={r.key}
                  description={t(`roles.${r.key}.blurb` as "roles.coordinator.blurb")}
                >
                  {t(`roles.${r.key}.label` as "roles.coordinator.label")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Preview */}
        <div className="space-y-2" aria-live="polite">
          <p className="text-sm font-medium">{t("changeRole.whatChanges")}</p>
          {!changed ? (
            <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
              {t("changeRole.pickDifferent")}
            </p>
          ) : changes.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
              {t("changeRole.noChanges")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {gains.map((c) => (
                <li key={c.key} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>
                    {t.rich(c.to === "view" ? "changeRole.gainView" : "changeRole.gainFull", {
                      b: (chunks) => <span className="font-medium">{chunks}</span>,
                      name,
                      cap: capLower(c),
                    })}
                  </span>
                </li>
              ))}
              {losses.map((c) => (
                <li key={c.key} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  <span>{lossSentence(c)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("changeRole.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!changed}
            onClick={() => onConfirm(role)}
            className={cn(losses.length > 0 && "bg-warning text-warning-foreground hover:bg-warning/90")}
          >
            {t("changeRole.confirm")}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
