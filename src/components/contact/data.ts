// Structure for the Contact page. Display text lives in messages/*.json (the `contact` namespace)
// and is resolved at render via t(). Email addresses stay here as literal, non-translatable data.

import { LifeBuoy, Mail, MessageSquare } from "lucide-react";

/** Topic option values; labels come from `contact.form.topics.<value>`. Must mirror the server
 *  action's enum in src/lib/contact/actions.ts. */
export const TOPIC_VALUES = ["general", "sales", "support", "partnerships", "press"] as const;

export type TopicValue = (typeof TOPIC_VALUES)[number];

export interface ContactMethod {
  icon: typeof Mail;
  /** Key into `contact.methods.<key>` for the label and note. */
  key: string;
  value: string;
  href: string;
}

export const CONTACT_METHODS = [
  {
    icon: Mail,
    key: "general",
    value: "hello@kintwadi.app",
    href: "mailto:hello@kintwadi.app",
  },
  {
    icon: MessageSquare,
    key: "sales",
    value: "sales@kintwadi.app",
    href: "mailto:sales@kintwadi.app",
  },
  {
    icon: LifeBuoy,
    key: "support",
    value: "support@kintwadi.app",
    href: "mailto:support@kintwadi.app",
  },
] as const;
