// Shared types for the pricing page.

import type { ButtonProps } from "@/components/ui/button";

export type TierId = "free" | "plus" | "teams";

export interface TierFeature {
  text: string;
  included: boolean;
}

export interface Tier {
  id: TierId;
  name: string;
  description: string;
  features: TierFeature[];
  cta: string;
  ctaVariant: NonNullable<ButtonProps["variant"]>;
  ctaHref: string;
  popular: boolean;
}

export interface ComparisonCategory {
  name: string;
  features: { name: string; free: boolean | string; plus: boolean | string; teams: boolean | string }[];
}

export interface Faq {
  question: string;
  answer: string;
}
