// Display constants for the People screen. Members + invites are loaded from the server
// (see src/lib/people/queries.ts) — this file only holds the roles + permissions reference.

import type { Access, CapabilityKey, CircleRole } from "./types";

/** Roles in display order, with a short blurb for the reference panel + invite summary. */
export const ROLES: { key: CircleRole; label: string; blurb: string }[] = [
  { key: "coordinator", label: "Coordinator", blurb: "Runs the circle. Full access, including settings and billing." },
  { key: "family-admin", label: "Family Admin", blurb: "Trusted family member who can manage people and most content." },
  { key: "family", label: "Family", blurb: "Family members who stay informed and help out day to day." },
  { key: "caregiver", label: "Caregiver", blurb: "Paid or volunteer carers who record care as it happens." },
  { key: "readonly", label: "Read-only", blurb: "Can follow along but can't change anything." },
  { key: "care-recipient", label: "Care recipient", blurb: "The person being cared for, with a gentle view of their own care." },
  { key: "clinician", label: "Clinician", blurb: "Doctors or nurses with clinical access, time-limited." },
];

export const roleMeta: Record<CircleRole, { label: string; tint: string }> = {
  coordinator: { label: "Coordinator", tint: "bg-primary/10 text-primary" },
  "family-admin": { label: "Family Admin", tint: "bg-accent/10 text-accent-foreground" },
  family: { label: "Family", tint: "bg-info/10 text-info" },
  caregiver: { label: "Caregiver", tint: "bg-success/10 text-success" },
  readonly: { label: "Read-only", tint: "bg-muted text-muted-foreground" },
  "care-recipient": { label: "Care recipient", tint: "bg-warning/10 text-warning" },
  clinician: { label: "Clinician", tint: "bg-info/10 text-info" },
};

/** Capability rows for the matrix / role summaries. */
export const CAPABILITIES: { key: CapabilityKey; label: string; sensitive?: boolean }[] = [
  { key: "timeline", label: "Timeline & updates" },
  { key: "meds", label: "Medications" },
  { key: "appts", label: "Appointments" },
  { key: "tasks", label: "Tasks & rota" },
  { key: "health", label: "Health vitals" },
  { key: "docsMedical", label: "Medical documents" },
  { key: "docsFinancial", label: "Financial & legal docs", sensitive: true },
  { key: "people", label: "People & roles" },
  { key: "billing", label: "Settings & billing", sensitive: true },
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
