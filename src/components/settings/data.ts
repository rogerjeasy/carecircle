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

// Labels live in messages (`settings.sections.*`), keyed by these stable section ids.
export const SECTIONS: { id: SectionId; icon: typeof User }[] = [
  { id: "account", icon: User },
  { id: "care-circle", icon: Home },
  { id: "members", icon: Users },
  { id: "notifications", icon: Bell },
  { id: "health-alerts", icon: HeartPulse },
  { id: "billing", icon: CreditCard },
  { id: "privacy", icon: ShieldCheck },
];

// --- Notifications matrix --- (labels resolved via `settings.notifications.channels/types.*`)
export const NOTIF_CHANNELS = [{ key: "inApp" }, { key: "email" }, { key: "push" }] as const;

export const NOTIF_TYPES = [
  { key: "meds" },
  { key: "vitals" },
  { key: "tasks" },
  { key: "incidents" },
  { key: "digest" },
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
// Plan catalog keyed by the `care_circle.plan` value the server returns. Prices/period are
// non-translatable; name/note/features are resolved from messages (`settings.billing.plans.<id>.*`).
export interface BillingPlan {
  id: string;
  /** Display price, e.g. "$0" or "$12"; "Custom" for sales-led plans. */
  price: string;
  /** Suffix after the price, e.g. "/month"; empty for custom pricing. */
  period: string;
}

export const BILLING_PLANS: BillingPlan[] = [
  { id: "free", price: "$0", period: "/month" },
  { id: "plus", price: "$12", period: "/month" },
  { id: "teams", price: "Custom", period: "" },
];

/** Whether a plan id has a localized catalog entry (else the UI shows the raw id). */
export const KNOWN_PLAN_IDS = new Set(BILLING_PLANS.map((p) => p.id));

/** Resolve a circle's stored plan value to its price/period (unknown values render plainly). */
export function billingPlanFor(planId: string): BillingPlan {
  return BILLING_PLANS.find((p) => p.id === planId) ?? { id: planId, price: "", period: "" };
}

export const LANGUAGES = ["English", "Español", "Português", "Français", "Italiano"];
export const TIMEZONES = ["Europe/Lisbon", "Europe/Madrid", "America/New_York", "America/Los_Angeles", "UTC"];
