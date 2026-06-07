"use client";

import * as React from "react";
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
import { changeSentence, firstName, roleChangePreview } from "./utils";
import type { CircleRole, Member } from "./types";

export interface ChangeRoleDialogProps {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (role: CircleRole) => void;
}

/** Confirm a role change with a live preview of exactly what access will change. */
export function ChangeRoleDialog({ member, open, onOpenChange, onConfirm }: ChangeRoleDialogProps) {
  const [role, setRole] = React.useState<CircleRole>(member.role);
  const changes = React.useMemo(() => roleChangePreview(member.role, role), [member.role, role]);
  const gains = changes.filter((c) => c.direction === "gain");
  const losses = changes.filter((c) => c.direction === "loss");
  const changed = role !== member.role;
  const name = firstName(member.name);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Change role"
      description={`Update what ${name} can see and do.`}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {/* From → To */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <RoleBadge role={member.role} />
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <RoleBadge role={role} />
        </div>

        <FormField htmlFor="new-role" label="New role">
          <Select value={role} onValueChange={(v) => setRole(v as CircleRole)}>
            <SelectTrigger id="new-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.key} value={r.key} description={r.blurb}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {/* Preview */}
        <div className="space-y-2" aria-live="polite">
          <p className="text-sm font-medium">What changes</p>
          {!changed ? (
            <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
              Pick a different role to preview the changes.
            </p>
          ) : changes.length === 0 ? (
            <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
              No access changes between these roles.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {gains.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{name}</span> will gain {changeSentence(name, c).toLowerCase()}
                  </span>
                </li>
              ))}
              {losses.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  <span>{changeSentence(name, c)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-background px-5 py-3 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!changed}
            onClick={() => onConfirm(role)}
            className={cn(losses.length > 0 && "bg-warning text-warning-foreground hover:bg-warning/90")}
          >
            Confirm change
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
