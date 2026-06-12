// Display constants for the Settings area. The circle's actual plan, payment methods, and
// invoices are real data loaded from the server (see src/lib/billing/actions.ts).

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
// The plan catalog, keyed by the `care_circle.plan` value the server returns. Names, prices, and
// features mirror the public pricing page (src/components/pricing/data.ts).
export interface BillingPlan {
  id: string;
  name: string;
  /** Display price, e.g. "$0" or "$12"; "Custom" for sales-led plans. */
  price: string;
  /** Suffix after the price, e.g. "/month"; empty for custom pricing. */
  period: string;
  note: string;
  features: string[];
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
    note: "For families getting started",
    features: ["One care circle", "Shared care timeline", "Medication tracking", "Task management"],
  },
  {
    id: "plus",
    name: "Plus",
    price: "$12",
    period: "/month",
    note: "AI assistance for busy families",
    features: ["Multiple care circles", "AI Daily Digest", "Ask Kintwadi AI", "Document vault (5GB)"],
  },
  {
    id: "teams",
    name: "Care Teams",
    price: "Custom",
    period: "",
    note: "Agencies & organizations",
    features: ["Unlimited care circles", "Audit trail & compliance", "Priority support", "HIPAA BAA available"],
  },
];

/** Resolve a circle's stored plan value to its catalog entry (unknown values render plainly). */
export function billingPlanFor(planId: string): BillingPlan {
  return (
    BILLING_PLANS.find((p) => p.id === planId) ?? {
      id: planId,
      name: planId.charAt(0).toUpperCase() + planId.slice(1),
      price: "",
      period: "",
      note: "",
      features: [],
    }
  );
}

export const LANGUAGES = ["English", "Español", "Português", "Français", "Italiano"];
export const TIMEZONES = ["Europe/Lisbon", "Europe/Madrid", "America/New_York", "America/Los_Angeles", "UTC"];
