// Display constants for the People screen. Members + invites are loaded from the server
// (see src/lib/people/queries.ts) — this file only holds the roles + permissions reference.

import type { Access, CapabilityKey, CircleRole } from "./types";

// Roles in display order (labels/blurbs resolved via `people.roles.<key>.label` / `.blurb`).
export const ROLES: { key: CircleRole }[] = [
  { key: "coordinator" },
  { key: "family-admin" },
  { key: "family" },
  { key: "caregiver" },
  { key: "readonly" },
  { key: "care-recipient" },
  { key: "clinician" },
];

// Role badge tints (labels resolved via `people.roles.<key>.label`).
export const roleMeta: Record<CircleRole, { tint: string }> = {
  coordinator: { tint: "bg-primary/10 text-primary" },
  "family-admin": { tint: "bg-accent/10 text-accent-foreground" },
  family: { tint: "bg-info/10 text-info" },
  caregiver: { tint: "bg-success/10 text-success" },
  readonly: { tint: "bg-muted text-muted-foreground" },
  "care-recipient": { tint: "bg-warning/10 text-warning" },
  clinician: { tint: "bg-info/10 text-info" },
};

// Capability rows for the matrix / role summaries (labels resolved via `people.capabilities.<key>`).
export const CAPABILITIES: { key: CapabilityKey; sensitive?: boolean }[] = [
  { key: "timeline" },
  { key: "meds" },
  { key: "appts" },
  { key: "tasks" },
  { key: "health" },
  { key: "docsMedical" },
  { key: "docsFinancial", sensitive: true },
  { key: "people" },
  { key: "billing" },
];

const E: Access = "edit";
const V: Access = "view";
const N: Access = "none";

/** The permission matrix: capability → role → access. The single source of truth for previews. */
export const PERMISSIONS: Record<CapabilityKey, Record<CircleRole, Access>> = {
  //              coord  fam-admin  family  caregiver readonly care-recip clinician
  timeline: { coordinator: E, "family-admin": E, family: E, caregiver: E, readonly: V, "care-recipient": V, clinician: V },
  meds: { coordinator: E, "family-admin": E, family: V, caregiver: E, readonly: V, "care-recipient": V, clinician: E },
  appts: { coordinator: E, "family-admin": E, family: E, caregiver: E, readonly: V, "care-recipient": V, clinician: V },
  tasks: { coordinator: E, "family-admin": E, family: V, caregiver: E, readonly: N, "care-recipient": N, clinician: N },
  health: { coordinator: E, "family-admin": E, family: V, caregiver: E, readonly: V, "care-recipient": V, clinician: E },
  docsMedical: { coordinator: E, "family-admin": E, family: V, caregiver: V, readonly: N, "care-recipient": V, clinician: V },
  docsFinancial: { coordinator: E, "family-admin": E, family: N, caregiver: N, readonly: N, "care-recipient": V, clinician: N },
  people: { coordinator: E, "family-admin": E, family: V, caregiver: N, readonly: N, "care-recipient": V, clinician: N },
  billing: { coordinator: E, "family-admin": N, family: N, caregiver: N, readonly: N, "care-recipient": N, clinician: N },
};
