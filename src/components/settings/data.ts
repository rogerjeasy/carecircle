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
  { name: "Family", price: "$12", note: "Up to 10 members" },
  { name: "Care team", price: "$29", note: "Unlimited + clinicians" },
];

export const LANGUAGES = ["English", "Español", "Português", "Français", "Italiano"];
export const TIMEZONES = ["Europe/Lisbon", "Europe/Madrid", "America/New_York", "America/Los_Angeles", "UTC"];
