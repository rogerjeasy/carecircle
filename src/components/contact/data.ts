// Content for the Contact page.

import { LifeBuoy, Mail, MessageSquare, Phone } from "lucide-react";

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
    value: "hello@carecircle.app",
    href: "mailto:hello@carecircle.app",
    note: "Questions about CareCircle and how it works.",
  },
  {
    icon: MessageSquare,
    label: "Sales",
    value: "sales@carecircle.app",
    href: "mailto:sales@carecircle.app",
    note: "Plans, agencies, employers and custom quotes.",
  },
  {
    icon: LifeBuoy,
    label: "Support",
    value: "support@carecircle.app",
    href: "mailto:support@carecircle.app",
    note: "Help with your account or care circle.",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (555) 0100-CARE",
    href: "tel:+15550100",
    note: "Mon–Fri, 9am–6pm in your time zone.",
  },
];
