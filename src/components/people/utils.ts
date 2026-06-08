// Pure helpers shared across the People screen.

import { formatDistanceToNowStrict } from "date-fns";
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

export const statusMeta: Record<
  MemberStatus,
  { label: string; variant: "success" | "warning" | "secondary"; dot: string }
> = {
  active: { label: "Active", variant: "success", dot: "bg-success" },
  invited: { label: "Invited", variant: "warning", dot: "bg-warning" },
  suspended: { label: "Suspended", variant: "secondary", dot: "bg-muted-foreground" },
};

/** "2 hours ago" / "Just now" / "—". */
export function lastActiveLabel(date: Date | null): string {
  if (!date) return "—";
  const mins = (Date.now() - date.getTime()) / 60000;
  if (mins < 5) return "Just now";
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function accessOf(capability: CapabilityKey, role: CircleRole): Access {
  return PERMISSIONS[capability][role];
}

const ACCESS_RANK: Record<Access, number> = { none: 0, view: 1, edit: 2 };
const ACCESS_VERB: Record<Access, string> = { none: "no", view: "view", edit: "full" };

/** Capabilities a role can see (view or edit) — for the "what this role can see" summary. */
export function roleCapabilities(role: CircleRole): { label: string; access: Access }[] {
  return CAPABILITIES.map((c) => ({ label: c.label, access: PERMISSIONS[c.key][role] }));
}

export interface RoleChange {
  label: string;
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
    return [{ label: c.label, from: a, to: b, direction: ACCESS_RANK[b] > ACCESS_RANK[a] ? "gain" : "loss" }];
  });
}

/** A one-line natural summary, e.g. "Grace will gain full access to Medical documents…". */
export function changeSentence(name: string, change: RoleChange): string {
  if (change.direction === "gain") {
    return `${ACCESS_VERB[change.to] === "view" ? "View" : "Full"} access to ${change.label.toLowerCase()}`;
  }
  return change.to === "none"
    ? `Loses access to ${change.label.toLowerCase()}`
    : `Reduced to ${ACCESS_VERB[change.to]} access for ${change.label.toLowerCase()}`;
}

export { roleMeta };

/** Sort members: active first, then invited, then suspended; alpha within. */
export function sortMembers(members: Member[]): Member[] {
  const order: Record<MemberStatus, number> = { active: 0, invited: 1, suspended: 2 };
  return [...members].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
}
