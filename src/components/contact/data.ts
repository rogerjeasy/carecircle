// Content for the Contact page.

import { LifeBuoy, Mail, MessageSquare } from "lucide-react";

export const TOPICS = [
  { value: "general", label: "General enquiry" },
  { value: "sales", label: "Sales & plans" },
  { value: "support", label: "Help & support" },
  { value: "partnerships", label: "Partnerships" },
  { value: "press", label: "Press" },
] as const;

export type TopicValue = (typeof TOPICS)[number]["value"];

export interface ContactMethod {
  icon: typeof Mail;
  label: string;
  value: string;
  href: string;
  note: string;
}

export const CONTACT_METHODS: ContactMethod[] = [
  {
    icon: Mail,
    label: "General",
    value: "hello@kintwadi.app",
    href: "mailto:hello@kintwadi.app",
    note: "Questions about Kintwadi and how it works.",
  },
  {
    icon: MessageSquare,
    label: "Sales",
    value: "sales@kintwadi.app",
    href: "mailto:sales@kintwadi.app",
    note: "Plans, agencies, employers and custom quotes.",
  },
  {
    icon: LifeBuoy,
    label: "Support",
    value: "support@kintwadi.app",
    href: "mailto:support@kintwadi.app",
    note: "Help with your account or care circle.",
  },
];
