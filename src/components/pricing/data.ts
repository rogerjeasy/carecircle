// Pricing data: prices, tiers, the comparison matrix, and FAQs.

import type { ComparisonCategory, Faq, Tier, TierId } from "./types";

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

export const tiers: Tier[] = [
  {
    id: "free",
    name: "Free",
    description: "For families just getting started with coordinated care.",
    features: [
      { text: "One care circle", included: true },
      { text: "Shared care timeline", included: true },
      { text: "Medication tracking", included: true },
      { text: "Task management", included: true },
      { text: "Basic roles (3 types)", included: true },
      { text: "Mobile app access", included: true },
      { text: "AI Daily Digest", included: false },
      { text: "Ask Kintwadi AI", included: false },
      { text: "Document vault", included: false },
      { text: "Advanced insights", included: false },
    ],
    cta: "Get started",
    ctaVariant: "outline",
    ctaHref: "/sign-up",
    popular: false,
  },
  {
    id: "plus",
    name: "Plus",
    description: "For families who need more power and AI assistance.",
    features: [
      { text: "Multiple care circles", included: true },
      { text: "Shared care timeline", included: true },
      { text: "Medication tracking", included: true },
      { text: "Task management", included: true },
      { text: "All 6 role types", included: true },
      { text: "Mobile app access", included: true },
      { text: "AI Daily Digest", included: true },
      { text: "Ask Kintwadi AI", included: true },
      { text: "Document vault (5GB)", included: true },
      { text: "Advanced insights", included: true },
    ],
    cta: "Start free trial",
    ctaVariant: "default",
    ctaHref: "/sign-up",
    popular: true,
  },
  {
    id: "teams",
    name: "Care Teams",
    description: "For agencies, employers, and healthcare organizations.",
    features: [
      { text: "Unlimited care circles", included: true },
      { text: "Multi-family dashboard", included: true },
      { text: "Audit trail & compliance", included: true },
      { text: "SSO / SAML integration", included: true },
      { text: "Custom roles & permissions", included: true },
      { text: "API access", included: true },
      { text: "Priority support", included: true },
      { text: "Dedicated success manager", included: true },
      { text: "HIPAA BAA available", included: true },
      { text: "Custom onboarding", included: true },
    ],
    cta: "Contact sales",
    ctaVariant: "secondary",
    ctaHref: "mailto:sales@kintwadi.app",
    popular: false,
  },
];

export const comparisonCategories: ComparisonCategory[] = [
  {
    name: "Core Features",
    features: [
      { name: "Care circles", free: "1", plus: "Unlimited", teams: "Unlimited" },
      { name: "Team members per circle", free: "10", plus: "25", teams: "Unlimited" },
      { name: "Shared timeline", free: true, plus: true, teams: true },
      { name: "Medication tracking", free: true, plus: true, teams: true },
      { name: "Task management", free: true, plus: true, teams: true },
      { name: "Appointment calendar", free: true, plus: true, teams: true },
    ],
  },
  {
    name: "AI & Intelligence",
    features: [
      { name: "AI Daily Digest", free: false, plus: true, teams: true },
      { name: "Ask Kintwadi AI", free: false, plus: true, teams: true },
      { name: "Smart reminders", free: "Basic", plus: "Advanced", teams: "Advanced" },
      { name: "Care insights", free: false, plus: true, teams: true },
    ],
  },
  {
    name: "Storage & Documents",
    features: [
      { name: "Document vault", free: false, plus: "5 GB", teams: "Unlimited" },
      { name: "Photo uploads", free: "100 MB", plus: "2 GB", teams: "Unlimited" },
      { name: "Export data", free: true, plus: true, teams: true },
    ],
  },
  {
    name: "Security & Compliance",
    features: [
      { name: "Role-based access", free: "3 roles", plus: "6 roles", teams: "Custom" },
      { name: "Audit trail", free: false, plus: "30 days", teams: "Unlimited" },
      { name: "SSO / SAML", free: false, plus: false, teams: true },
      { name: "HIPAA BAA", free: false, plus: false, teams: true },
      { name: "Data encryption", free: true, plus: true, teams: true },
    ],
  },
  {
    name: "Support",
    features: [
      { name: "Community support", free: true, plus: true, teams: true },
      { name: "Email support", free: false, plus: true, teams: true },
      { name: "Priority support", free: false, plus: false, teams: true },
      { name: "Dedicated success manager", free: false, plus: false, teams: true },
    ],
  },
];

export const faqs: Faq[] = [
  {
    question: "Can I switch plans later?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you will be charged the prorated difference. When you downgrade, your new rate will apply at the next billing cycle.",
  },
  {
    question: "What happens to my data if I downgrade?",
    answer:
      "Your data is never deleted. If you exceed the limits of your new plan (e.g., multiple circles on Free), you will still have read access but cannot add new content until you upgrade or reduce usage.",
  },
  {
    question: "Is there a free trial for Plus?",
    answer:
      "Yes! Plus comes with a 14-day free trial. No credit card required to start. You will get full access to all Plus features during the trial period.",
  },
  {
    question: "How does billing work for Care Teams?",
    answer:
      "Care Teams is billed annually based on the number of care circles and users. Contact our sales team for a custom quote tailored to your organization's needs.",
  },
  {
    question: "Is Kintwadi HIPAA compliant?",
    answer:
      "Kintwadi implements industry-standard security measures including encryption at rest and in transit. For organizations requiring a signed Business Associate Agreement (BAA), this is available on the Care Teams plan.",
  },
  {
    question: "Can I add family members for free?",
    answer:
      "Yes! All plans allow you to invite family members and caregivers to your care circles at no additional cost. The plan limits apply to the number of circles and features, not the number of people.",
  },
];
