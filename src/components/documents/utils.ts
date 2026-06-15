// Pure helpers shared across the Documents vault.

import { differenceInCalendarDays } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import type { DocumentItem } from "./types";

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

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Jun 3, 2026" style label, localized via native Intl (project convention). */
export function uploadedLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export type ExpiryState = "none" | "ok" | "soon" | "expired";

/** Localized "Aug 2026" style month label for the expiry pill. */
function monthLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { year: "numeric", month: "short" });
}

export interface ExpiryInfo {
  state: ExpiryState;
  /**
   * For "expired"/"ok": the localized month string (e.g. "Aug 2026"); the component wraps it in
   * the translated "Expired {month}" / "Expires {month}" sentence. For "soon": the day count.
   */
  value: string;
  /** Number of whole days until expiry (used for the pluralized "Expires in N days" label). */
  days: number;
}

/**
 * Expiry pill state + the localized value the component needs to render the label (soon = within
 * 60 days). The component resolves the surrounding sentence from messages.
 */
export function expiryInfo(doc: DocumentItem, now: Date, locale: string): ExpiryInfo {
  if (!doc.expiresAt) return { state: "none", value: "", days: 0 };
  const days = differenceInCalendarDays(doc.expiresAt, now);
  if (days < 0) return { state: "expired", value: monthLabel(doc.expiresAt, locale), days };
  if (days <= 60) return { state: "soon", value: String(days), days };
  return { state: "ok", value: monthLabel(doc.expiresAt, locale), days };
}

// A small, stable avatar palette (matches the app's tokens). Uploader colors are derived
// deterministically from a key (user id) so the same person is always the same color — computed
// identically on server and client.
const AVATAR_COLORS = [
  "bg-primary/10 text-primary",
  "bg-accent/10 text-accent",
  "bg-success/10 text-success",
  "bg-info/10 text-info",
  "bg-warning/10 text-warning",
];

export function avatarColorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Two-letter monogram from a name, falling back to "?". */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Human-readable file size, e.g. "1.2 MB" / "240 KB". */
export function formatSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1000) return `${Math.round(bytes / 1000)} KB`;
  return `${bytes} B`;
}
