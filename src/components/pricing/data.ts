// Pricing data: prices and structure. Display text lives in messages/*.json (the `pricing`
// namespace) and is resolved at render via t() — keyed by the stable keys below.

import type { TierId } from "./types";

export const MONTHLY_PRICES: Record<TierId, number | null> = {
  free: 0,
  plus: 12,
  teams: null, // Contact sales
};

export const ANNUAL_PRICES: Record<TierId, number | null> = {
  free: 0,
  plus: 9, // $108/year = $9/mo (25% savings)
  teams: null,
};

export const tiers = [
  {
    id: "free",
    features: [
      { key: "oneCircle", included: true },
      { key: "timeline", included: true },
      { key: "medTracking", included: true },
      { key: "taskMgmt", included: true },
      { key: "basicRoles", included: true },
      { key: "mobileApp", included: true },
      { key: "aiDigest", included: false },
      { key: "askAi", included: false },
      { key: "docVault", included: false },
      { key: "advInsights", included: false },
    ],
    ctaVariant: "outline",
    ctaHref: "/sign-up",
    popular: false,
  },
  {
    id: "plus",
    features: [
      { key: "multiCircles", included: true },
      { key: "timeline", included: true },
      { key: "medTracking", included: true },
      { key: "taskMgmt", included: true },
      { key: "allRoles", included: true },
      { key: "mobileApp", included: true },
      { key: "aiDigest", included: true },
      { key: "askAi", included: true },
      { key: "docVault5gb", included: true },
      { key: "advInsights", included: true },
    ],
    ctaVariant: "default",
    ctaHref: "/sign-up",
    popular: true,
  },
  {
    id: "teams",
    features: [
      { key: "unlimitedCircles", included: true },
      { key: "multiFamilyDash", included: true },
      { key: "auditCompliance", included: true },
      { key: "sso", included: true },
      { key: "customRoles", included: true },
      { key: "apiAccess", included: true },
      { key: "prioritySupport", included: true },
      { key: "successManager", included: true },
      { key: "hipaaBaa", included: true },
      { key: "customOnboarding", included: true },
    ],
    ctaVariant: "secondary",
    ctaHref: "mailto:sales@kintwadi.app",
    popular: false,
  },
] as const;

// Comparison-matrix values: booleans render as a check/cross; a "tk:<token>" string is resolved
// via the `pricing.comparison.values` namespace; any other string (numbers, sizes) is shown as-is.
export const comparisonCategories = [
  {
    key: "core",
    features: [
      { key: "careCircles", free: "1", plus: "tk:unlimited", teams: "tk:unlimited" },
      { key: "teamMembers", free: "10", plus: "25", teams: "tk:unlimited" },
      { key: "sharedTimeline", free: true, plus: true, teams: true },
      { key: "medTracking", free: true, plus: true, teams: true },
      { key: "taskMgmt", free: true, plus: true, teams: true },
      { key: "apptCalendar", free: true, plus: true, teams: true },
    ],
  },
  {
    key: "ai",
    features: [
      { key: "aiDigest", free: false, plus: true, teams: true },
      { key: "askAi", free: false, plus: true, teams: true },
      { key: "smartReminders", free: "tk:basic", plus: "tk:advanced", teams: "tk:advanced" },
      { key: "careInsights", free: false, plus: true, teams: true },
    ],
  },
  {
    key: "storage",
    features: [
      { key: "docVault", free: false, plus: "5 GB", teams: "tk:unlimited" },
      { key: "photoUploads", free: "100 MB", plus: "2 GB", teams: "tk:unlimited" },
      { key: "exportData", free: true, plus: true, teams: true },
    ],
  },
  {
    key: "security",
    features: [
      { key: "roleAccess", free: "tk:roles3", plus: "tk:roles6", teams: "tk:custom" },
      { key: "auditTrail", free: false, plus: "tk:days30", teams: "tk:unlimited" },
      { key: "ssoSaml", free: false, plus: false, teams: true },
      { key: "hipaaBaa", free: false, plus: false, teams: true },
      { key: "encryption", free: true, plus: true, teams: true },
    ],
  },
  {
    key: "support",
    features: [
      { key: "communitySupport", free: true, plus: true, teams: true },
      { key: "emailSupport", free: false, plus: true, teams: true },
      { key: "prioritySupport", free: false, plus: false, teams: true },
      { key: "successManager", free: false, plus: false, teams: true },
    ],
  },
] as const;

// FAQ entries — stable keys; question/answer text comes from messages.
export const faqs = [
  { key: "switch" },
  { key: "data" },
  { key: "trial" },
  { key: "teamsBilling" },
  { key: "hipaa" },
  { key: "freeMembers" },
] as const;
