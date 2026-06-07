// Display constants + demo data for the Settings area.

import {
  Bell,
  CreditCard,
  HeartPulse,
  ShieldCheck,
  User,
  Users,
  Home,
} from "lucide-react";

export type SectionId =
  | "account"
  | "care-circle"
  | "members"
  | "notifications"
  | "health-alerts"
  | "billing"
  | "privacy";

export const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "care-circle", label: "Care circle", icon: Home },
  { id: "members", label: "Members & roles", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "health-alerts", label: "Health alerts", icon: HeartPulse },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Privacy & security", icon: ShieldCheck },
];

// --- Notifications matrix ---
export const NOTIF_CHANNELS = [
  { key: "inApp", label: "In-app" },
  { key: "email", label: "Email" },
  { key: "push", label: "Push" },
] as const;

export const NOTIF_TYPES = [
  { key: "meds", label: "Medications" },
  { key: "vitals", label: "Vitals" },
  { key: "tasks", label: "Tasks" },
  { key: "incidents", label: "Incidents" },
  { key: "digest", label: "Daily digest" },
] as const;

export type ChannelKey = (typeof NOTIF_CHANNELS)[number]["key"];
export type NotifTypeKey = (typeof NOTIF_TYPES)[number]["key"];
export type NotifMatrix = Record<NotifTypeKey, Record<ChannelKey, boolean>>;

export const DEFAULT_MATRIX: NotifMatrix = {
  meds: { inApp: true, email: false, push: true },
  vitals: { inApp: true, email: false, push: false },
  tasks: { inApp: true, email: true, push: false },
  incidents: { inApp: true, email: true, push: true },
  digest: { inApp: true, email: true, push: false },
};

// --- Billing ---
export const CURRENT_PLAN = {
  name: "Family",
  price: "$12",
  period: "/month",
  features: ["Up to 10 members", "Unlimited documents", "Daily AI digest", "Priority support"],
};

export const PLANS = [
  { name: "Solo", price: "$0", note: "1–2 members" },
  { name: "Family", price: "$12", note: "Up to 10 members", current: true },
  { name: "Care team", price: "$29", note: "Unlimited + clinicians" },
];

export const INVOICES = [
  { id: "INV-2026-006", date: "Jun 1, 2026", amount: "$12.00", status: "Paid" },
  { id: "INV-2026-005", date: "May 1, 2026", amount: "$12.00", status: "Paid" },
  { id: "INV-2026-004", date: "Apr 1, 2026", amount: "$12.00", status: "Paid" },
  { id: "INV-2026-003", date: "Mar 1, 2026", amount: "$12.00", status: "Paid" },
];

// --- Sessions ---
export const SESSIONS = [
  { id: "s1", device: "Chrome · MacBook Pro", location: "Lisbon, PT", lastActive: "Active now", current: true },
  { id: "s2", device: "CareCircle iOS app · iPhone 15", location: "Lisbon, PT", lastActive: "2 hours ago", current: false },
  { id: "s3", device: "Safari · iPad", location: "Porto, PT", lastActive: "Yesterday", current: false },
];

// --- Audit log (append-only, read-only) ---
export type AuditAction = "create" | "update" | "view" | "give" | "assign" | "complete" | "invite" | "role" | "resolve";

export interface AuditEntry {
  id: string;
  actor: { name: string; initials: string; color: string };
  action: AuditAction;
  /** Human action phrase, e.g. "gave medication". */
  actionLabel: string;
  entity: string;
  at: string; // pre-formatted demo timestamp
}

const A = {
  maria: { name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent" },
  grace: { name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary" },
  paolo: { name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info" },
  carlos: { name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success" },
};

export const AUDIT_ENTRIES: AuditEntry[] = [
  { id: "a1", actor: A.grace, action: "give", actionLabel: "gave medication", entity: "Lisinopril 10mg", at: "Jun 7, 2026 · 8:04 AM" },
  { id: "a2", actor: A.maria, action: "view", actionLabel: "viewed document", entity: "Power of attorney", at: "Jun 7, 2026 · 7:55 AM" },
  { id: "a3", actor: A.grace, action: "create", actionLabel: "reported incident", entity: "Fall — needs attention", at: "Jun 7, 2026 · 7:40 AM" },
  { id: "a4", actor: A.paolo, action: "complete", actionLabel: "completed task", entity: "Order refill", at: "Jun 6, 2026 · 5:12 PM" },
  { id: "a5", actor: A.maria, action: "role", actionLabel: "changed role", entity: "Grace → Caregiver", at: "Jun 6, 2026 · 3:30 PM" },
  { id: "a6", actor: A.maria, action: "invite", actionLabel: "invited member", entity: "elena@example.com", at: "Jun 6, 2026 · 3:28 PM" },
  { id: "a7", actor: A.carlos, action: "assign", actionLabel: "assigned task", entity: "Buy groceries → Carlos", at: "Jun 6, 2026 · 11:02 AM" },
  { id: "a8", actor: A.grace, action: "update", actionLabel: "updated vitals", entity: "Blood pressure 128/82", at: "Jun 6, 2026 · 8:10 AM" },
  { id: "a9", actor: A.maria, action: "resolve", actionLabel: "resolved incident", entity: "Hospitalization (May)", at: "Jun 5, 2026 · 9:00 PM" },
  { id: "a10", actor: A.maria, action: "view", actionLabel: "exported data", entity: "Care record (PDF)", at: "Jun 5, 2026 · 2:15 PM" },
];

export const LANGUAGES = ["English", "Español", "Português", "Français", "Italiano"];
export const TIMEZONES = ["Europe/Lisbon", "Europe/Madrid", "America/New_York", "America/Los_Angeles", "UTC"];
