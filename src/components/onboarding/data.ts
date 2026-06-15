// Constants + demo option lists for the onboarding wizard.

import type { OnboardingData } from "./types";

export const STORAGE_KEY = "carecircle-onboarding";

export const defaultData: OnboardingData = {
  recipientName: "",
  recipientDateOfBirth: "",
  recipientPhoto: null,
  relationship: "",
  conditions: [],
  allergies: [],
  primaryLanguage: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  invites: [],
};

// Suggestion-list keys for the chip inputs (display text resolved via
// `onboarding.conditions.<key>` / `onboarding.allergies.<key>`). The added chip stores the
// localized label string itself (this is free-text data the user curates), so the suggestions
// only drive the dropdown — the resolved label is what gets added.
export const commonConditionKeys = [
  "diabetes",
  "hypertension",
  "heartDisease",
  "arthritis",
  "dementia",
  "alzheimers",
  "parkinsons",
  "copd",
  "asthma",
  "cancer",
  "stroke",
  "depression",
] as const;

export const commonAllergyKeys = [
  "penicillin",
  "sulfaDrugs",
  "aspirin",
  "nsaids",
  "latex",
  "peanuts",
  "shellfish",
  "eggs",
  "dairy",
  "gluten",
  "beeStings",
  "contrastDye",
] as const;

// Relationship options. `value` is the canonical (lowercased) value stored on the recipient;
// the display label is resolved via `onboarding.relationships.<key>`.
export const relationships = [
  { value: "parent", key: "parent" },
  { value: "spouse/partner", key: "spousePartner" },
  { value: "grandparent", key: "grandparent" },
  { value: "sibling", key: "sibling" },
  { value: "child", key: "child" },
  { value: "in-law", key: "inLaw" },
  { value: "friend", key: "friend" },
  { value: "neighbor", key: "neighbor" },
  { value: "client", key: "client" },
  { value: "other", key: "other" },
] as const;

// Primary-language options. `value` is the stored (lowercased) value; the display label is
// resolved via `onboarding.languages.<key>`.
export const languages = [
  { value: "english", key: "english" },
  { value: "spanish", key: "spanish" },
  { value: "french", key: "french" },
  { value: "portuguese", key: "portuguese" },
  { value: "german", key: "german" },
  { value: "italian", key: "italian" },
  { value: "chinese (mandarin)", key: "mandarin" },
  { value: "chinese (cantonese)", key: "cantonese" },
  { value: "japanese", key: "japanese" },
  { value: "korean", key: "korean" },
  { value: "vietnamese", key: "vietnamese" },
  { value: "tagalog", key: "tagalog" },
  { value: "arabic", key: "arabic" },
  { value: "hindi", key: "hindi" },
  { value: "russian", key: "russian" },
  { value: "polish", key: "polish" },
  { value: "other", key: "other" },
] as const;

// Time-zone options. `value` is the canonical IANA id (stored verbatim); the display label is
// resolved via `onboarding.timezones.<key>`.
export const timezones = [
  { value: "America/New_York", key: "easternTime" },
  { value: "America/Chicago", key: "centralTime" },
  { value: "America/Denver", key: "mountainTime" },
  { value: "America/Los_Angeles", key: "pacificTime" },
  { value: "America/Anchorage", key: "alaskaTime" },
  { value: "Pacific/Honolulu", key: "hawaiiTime" },
  { value: "Europe/London", key: "london" },
  { value: "Europe/Paris", key: "centralEuropean" },
  { value: "Europe/Berlin", key: "berlin" },
  { value: "Asia/Tokyo", key: "japan" },
  { value: "Asia/Shanghai", key: "china" },
  { value: "Asia/Kolkata", key: "india" },
  { value: "Australia/Sydney", key: "sydney" },
] as const;

// Values match the schema's `role` enum (minus `owner`, which is the inviter).
// The label/description are resolved via `onboarding.roles.<value>.label` / `.description`.
export const inviteRoles = [
  { value: "family" },
  { value: "family_admin" },
  { value: "caregiver" },
  { value: "clinician" },
  { value: "care_recipient" },
  { value: "read_only" },
] as const;

// Step transition animations (framer-motion variants).
export const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};
