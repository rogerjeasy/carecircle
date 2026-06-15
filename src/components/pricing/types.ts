// Shared types for the pricing page.

import type { ButtonProps } from "@/components/ui/button";

export type TierId = "free" | "plus" | "teams";

export interface TierFeature {
  /** Key into the `pricing.featureLabels` message namespace. */
  key: string;
  included: boolean;
}

export interface Tier {
  id: TierId;
  features: TierFeature[];
  ctaVariant: NonNullable<ButtonProps["variant"]>;
  ctaHref: string;
  popular: boolean;
}

/** A comparison-matrix value: a boolean (check/cross), or a string that is either a literal
 *  (e.g. "5 GB") or a "tk:<token>" reference into `pricing.comparison.values`. */
export type ComparisonValue = boolean | string;

export interface ComparisonCategory {
  /** Key into `pricing.comparison.categories`. */
  key: string;
  features: { key: string; free: ComparisonValue; plus: ComparisonValue; teams: ComparisonValue }[];
}

export interface Faq {
  /** Key into the `pricing.faq.items` message namespace. */
  key: string;
}
