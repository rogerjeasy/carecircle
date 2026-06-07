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

export const categoryMeta: Record<DocCategory, { label: string; icon: typeof FileText; tint: string }> = {
  medical: { label: "Medical", icon: HeartPulse, tint: "bg-accent/10 text-accent" },
  insurance: { label: "Insurance", icon: ShieldCheck, tint: "bg-info/10 text-info" },
  legal: { label: "Legal", icon: Scale, tint: "bg-primary/10 text-primary" },
  financial: { label: "Financial", icon: Wallet, tint: "bg-warning/10 text-warning" },
  id: { label: "ID", icon: BadgeCheck, tint: "bg-success/10 text-success" },
  "advance-directive": { label: "Advance directive", icon: Landmark, tint: "bg-muted text-muted-foreground" },
};

/** Filter options, including the "All" pseudo-category. */
export const CATEGORY_FILTERS: { value: DocCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "medical", label: "Medical" },
  { value: "insurance", label: "Insurance" },
  { value: "legal", label: "Legal" },
  { value: "financial", label: "Financial" },
  { value: "id", label: "ID" },
  { value: "advance-directive", label: "Advance directive" },
];

export const sensitivityMeta: Record<
  Sensitivity,
  { label: string; note: string; locked: boolean }
> = {
  standard: { label: "Standard", note: "Visible to everyone in the circle.", locked: false },
  sensitive: { label: "Sensitive", note: "Visible to family and coordinators.", locked: false },
  restricted: { label: "Restricted", note: "Visible to coordinators only.", locked: true },
};
