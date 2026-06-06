// Pure helpers shared across the Medications screen.

import { format } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import { LOW_SUPPLY_THRESHOLD } from "./data";

/** Edit/manage actions are limited to the Coordinator and Family roles. */
export function canManageMeds(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

/** Read-only members can view but not record doses. */
export function canRecordDoses(role: UserRole): boolean {
  return role !== "readonly";
}

/** Current wall-clock time as a compact label, e.g. "8:04am". */
export function nowTimeLabel(): string {
  return format(new Date(), "h:mma").toLowerCase();
}

/** First name (for "given by …" attribution), falling back to "You". */
export function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || "You";
}

/** Colour treatment for a supply level — critical (≤3d), low (≤threshold), or normal. */
export function supplyTone(days: number): { className: string; pillClassName: string } {
  if (days <= 3) {
    return {
      className: "text-destructive",
      pillClassName: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
    };
  }
  if (days <= LOW_SUPPLY_THRESHOLD) {
    return {
      className: "text-warning",
      pillClassName: "bg-warning/10 text-warning ring-1 ring-warning/20",
    };
  }
  return {
    className: "text-muted-foreground",
    pillClassName: "bg-muted text-muted-foreground ring-1 ring-border",
  };
}
