// Pure helpers shared across the Documents vault.

import { differenceInCalendarDays, format } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import { MEMBERS } from "./data";
import type { DocumentItem, Member } from "./types";

/** Uploading / managing documents is open to caregiving roles; others view what they're allowed to. */
export function canUpload(role: UserRole): boolean {
  return role === "coordinator" || role === "family" || role === "caregiver";
}

/** Only coordinators (and family admins) may see restricted documents; others see locked placeholders. */
export function canSeeRestricted(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

/** Whether THIS document is locked for the given role (drives the RBAC placeholder card). */
export function isLockedFor(doc: DocumentItem, role: UserRole): boolean {
  return doc.sensitivity === "restricted" && !canSeeRestricted(role);
}

export function memberById(id: string): Member | undefined {
  return MEMBERS.find((m) => m.id === id);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Uploaded Jun 3" style label. */
export function uploadedLabel(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export type ExpiryState = "none" | "ok" | "soon" | "expired";

export interface ExpiryInfo {
  state: ExpiryState;
  /** e.g. "Expires Aug 2026" / "Expired Jan 2026" / "Expires in 12 days". */
  label: string;
}

/** Expiry pill content + urgency (soon = within 60 days). */
export function expiryInfo(doc: DocumentItem, now: Date): ExpiryInfo {
  if (!doc.expiresAt) return { state: "none", label: "" };
  const days = differenceInCalendarDays(doc.expiresAt, now);
  if (days < 0) return { state: "expired", label: `Expired ${format(doc.expiresAt, "MMM yyyy")}` };
  if (days <= 60) return { state: "soon", label: `Expires in ${days} day${days === 1 ? "" : "s"}` };
  return { state: "ok", label: `Expires ${format(doc.expiresAt, "MMM yyyy")}` };
}
