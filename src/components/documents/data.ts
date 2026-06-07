// Demo seed data + display constants for the Documents vault.

import {
  BadgeCheck,
  FileText,
  HeartPulse,
  Landmark,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { addDays, startOfDay } from "date-fns";
import type { DocCategory, DocumentItem, DocumentSeed, Member, Sensitivity } from "./types";

export const MEMBERS: Member[] = [
  { id: "maria", name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent" },
  { id: "grace", name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary" },
  { id: "paolo", name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info" },
  { id: "carlos", name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success" },
];

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

const seed: DocumentSeed[] = [
  { id: "d1", title: "Cardiology discharge summary", category: "medical", sensitivity: "sensitive", kind: "pdf", size: "1.4 MB", uploadedById: "grace", uploadedDaysAgo: 3, onEmergencyCard: true },
  { id: "d2", title: "Medication list (current)", category: "medical", sensitivity: "standard", kind: "pdf", size: "240 KB", uploadedById: "maria", uploadedDaysAgo: 1, onEmergencyCard: true },
  { id: "d3", title: "Health insurance card", category: "insurance", sensitivity: "sensitive", kind: "image", size: "820 KB", uploadedById: "maria", uploadedDaysAgo: 30, expiresInDays: 120, onEmergencyCard: true, previewUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80" },
  { id: "d4", title: "Supplemental insurance policy", category: "insurance", sensitivity: "sensitive", kind: "pdf", size: "2.1 MB", uploadedById: "carlos", uploadedDaysAgo: 60, expiresInDays: 75, onEmergencyCard: false },
  { id: "d5", title: "Power of attorney", category: "legal", sensitivity: "restricted", kind: "pdf", size: "3.0 MB", uploadedById: "maria", uploadedDaysAgo: 200, onEmergencyCard: false },
  { id: "d6", title: "Last will & testament", category: "legal", sensitivity: "restricted", kind: "pdf", size: "1.8 MB", uploadedById: "maria", uploadedDaysAgo: 210, onEmergencyCard: false },
  { id: "d7", title: "Bank account details", category: "financial", sensitivity: "restricted", kind: "pdf", size: "180 KB", uploadedById: "maria", uploadedDaysAgo: 45, onEmergencyCard: false },
  { id: "d8", title: "Pension statement 2026", category: "financial", sensitivity: "restricted", kind: "pdf", size: "640 KB", uploadedById: "carlos", uploadedDaysAgo: 90, onEmergencyCard: false },
  { id: "d9", title: "Passport scan", category: "id", sensitivity: "sensitive", kind: "image", size: "1.1 MB", uploadedById: "grace", uploadedDaysAgo: 120, expiresInDays: 400, onEmergencyCard: false, previewUrl: "https://images.unsplash.com/photo-1569949381669-ecf31ae8e613?w=800&q=80" },
  { id: "d10", title: "Driver's licence", category: "id", sensitivity: "sensitive", kind: "image", size: "900 KB", uploadedById: "paolo", uploadedDaysAgo: 20, expiresInDays: 30, onEmergencyCard: true, previewUrl: "https://images.unsplash.com/photo-1606166187734-a4cb74079037?w=800&q=80" },
  { id: "d11", title: "Advance care directive", category: "advance-directive", sensitivity: "sensitive", kind: "pdf", size: "520 KB", uploadedById: "maria", uploadedDaysAgo: 150, onEmergencyCard: true },
  { id: "d12", title: "DNR order", category: "advance-directive", sensitivity: "sensitive", kind: "pdf", size: "210 KB", uploadedById: "grace", uploadedDaysAgo: 150, onEmergencyCard: true },
];

/** Resolve the seed into concrete `DocumentItem`s relative to a fixed "now". */
export function buildDocuments(now: Date): DocumentItem[] {
  return seed.map(({ uploadedDaysAgo, expiresInDays, ...rest }) => ({
    ...rest,
    uploadedAt: addDays(startOfDay(now), -uploadedDaysAgo),
    expiresAt: expiresInDays == null ? undefined : addDays(startOfDay(now), expiresInDays),
  }));
}
