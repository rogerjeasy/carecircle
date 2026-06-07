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

export const commonConditions = [
  "Diabetes",
  "Hypertension",
  "Heart disease",
  "Arthritis",
  "Dementia",
  "Alzheimer's",
  "Parkinson's",
  "COPD",
  "Asthma",
  "Cancer",
  "Stroke",
  "Depression",
];

export const commonAllergies = [
  "Penicillin",
  "Sulfa drugs",
  "Aspirin",
  "NSAIDs",
  "Latex",
  "Peanuts",
  "Shellfish",
  "Eggs",
  "Dairy",
  "Gluten",
  "Bee stings",
  "Contrast dye",
];

export const relationships = [
  "Parent",
  "Spouse/Partner",
  "Grandparent",
  "Sibling",
  "Child",
  "In-law",
  "Friend",
  "Neighbor",
  "Client",
  "Other",
];

export const languages = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Italian",
  "Chinese (Mandarin)",
  "Chinese (Cantonese)",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Tagalog",
  "Arabic",
  "Hindi",
  "Russian",
  "Polish",
  "Other",
];

export const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

// Values match the schema's `role` enum (minus `owner`, which is the inviter).
// The `description` is shown under each option to clarify what the role can do.
export const inviteRoles = [
  { value: "family", label: "Family member", description: "View updates and help coordinate care" },
  { value: "family_admin", label: "Family admin", description: "Manage people, roles, and circle settings" },
  { value: "caregiver", label: "Caregiver", description: "Log meds, vitals, tasks, and daily care" },
  { value: "clinician", label: "Clinician", description: "Doctor, nurse, or therapist — clinical access" },
  { value: "care_recipient", label: "Care recipient", description: "The person receiving care" },
  { value: "read_only", label: "Read-only", description: "Can view, but not make changes" },
];

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
