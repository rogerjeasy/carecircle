// Pure helpers shared across the People screen.

import type { UserRole } from "@/components/app-shell/app-shell-context";
import { CAPABILITIES, PERMISSIONS, roleMeta } from "./data";
import type { Access, CapabilityKey, CircleRole, Member, MemberStatus } from "./types";

/** Managing people (roles, invites, suspend/remove) is limited to coordinators (owner / family admin). */
export function canManagePeople(role: UserRole): boolean {
  return role === "coordinator";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

// Status badge styling (labels resolved via `people.status.<status>`).
export const statusMeta: Record<
  MemberStatus,
  { variant: "success" | "warning" | "secondary"; dot: string }
> = {
  active: { variant: "success", dot: "bg-success" },
  invited: { variant: "warning", dot: "bg-warning" },
  suspended: { variant: "secondary", dot: "bg-muted-foreground" },
};

/**
 * Relative "last active" label, localized via native Intl.RelativeTimeFormat. Returns the dash
 * for no date, and the "just now" string (passed in from messages) for very recent activity.
 */
export function lastActiveLabel(
  date: Date | null,
  locale: string,
  labels: { dash: string; justNow: string }
): string {
  if (!date) return labels.dash;
  const diffMs = date.getTime() - Date.now();
  const mins = -diffMs / 60000;
  if (mins < 5) return labels.justNow;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "long" });
  const minsAbs = Math.round(mins);
  if (minsAbs < 60) return rtf.format(-minsAbs, "minute");
  const hours = Math.round(minsAbs / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.round(months / 12), "year");
}

export function accessOf(capability: CapabilityKey, role: CircleRole): Access {
  return PERMISSIONS[capability][role];
}

const ACCESS_RANK: Record<Access, number> = { none: 0, view: 1, edit: 2 };

/** Capabilities a role can see (view or edit) — for the "what this role can see" summary. */
export function roleCapabilities(role: CircleRole): { key: CapabilityKey; access: Access }[] {
  return CAPABILITIES.map((c) => ({ key: c.key, access: PERMISSIONS[c.key][role] }));
}

export interface RoleChange {
  key: CapabilityKey;
  from: Access;
  to: Access;
  direction: "gain" | "loss";
}

/** Diff two roles' access across all capabilities (for the change-role preview). */
export function roleChangePreview(from: CircleRole, to: CircleRole): RoleChange[] {
  return CAPABILITIES.flatMap((c) => {
    const a = PERMISSIONS[c.key][from];
    const b = PERMISSIONS[c.key][to];
    if (ACCESS_RANK[a] === ACCESS_RANK[b]) return [];
    return [{ key: c.key, from: a, to: b, direction: ACCESS_RANK[b] > ACCESS_RANK[a] ? "gain" : "loss" }];
  });
}

export { roleMeta };

/** Sort members: active first, then invited, then suspended; alpha within. */
export function sortMembers(members: Member[]): Member[] {
  const order: Record<MemberStatus, number> = { active: 0, invited: 1, suspended: 2 };
  return [...members].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
}
