// Display constants for the Documents vault. The documents themselves are loaded from the server
// (see src/lib/documents/queries.ts) — this file only holds static presentation metadata.

import {
  BadgeCheck,
  FileText,
  HeartPulse,
  Landmark,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { DocCategory, Sensitivity } from "./types";

// Icon + tint per category. Labels are resolved in components via `documents.categories.<value>`.
export const categoryMeta: Record<DocCategory, { icon: typeof FileText; tint: string }> = {
  medical: { icon: HeartPulse, tint: "bg-accent/10 text-accent" },
  insurance: { icon: ShieldCheck, tint: "bg-info/10 text-info" },
  legal: { icon: Scale, tint: "bg-primary/10 text-primary" },
  financial: { icon: Wallet, tint: "bg-warning/10 text-warning" },
  id: { icon: BadgeCheck, tint: "bg-success/10 text-success" },
  "advance-directive": { icon: Landmark, tint: "bg-muted text-muted-foreground" },
};

/**
 * Filter option values, including the "All" pseudo-category. Labels are resolved in components:
 * "all" via `documents.categoryFilters.all`, the rest via `documents.categories.<value>`.
 */
export const CATEGORY_FILTERS: { value: DocCategory | "all" }[] = [
  { value: "all" },
  { value: "medical" },
  { value: "insurance" },
  { value: "legal" },
  { value: "financial" },
  { value: "id" },
  { value: "advance-directive" },
];

// `locked` drives RBAC; label/note are resolved via `documents.sensitivities.<value>.{label,note}`.
export const sensitivityMeta: Record<Sensitivity, { locked: boolean }> = {
  standard: { locked: false },
  sensitive: { locked: false },
  restricted: { locked: true },
};
