"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

/** Pricing hero: heading + the monthly/annual billing toggle. */
export function PricingHero({
  isAnnual,
  onIsAnnualChange,
}: {
  isAnnual: boolean;
  onIsAnnualChange: (annual: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="motion-reduce:animate-none"
    >
      <Badge variant="secondary" className="mb-4">
        Simple, transparent pricing
      </Badge>
      <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-balance">
        Choose the plan that fits <span className="text-primary">your family</span>
      </h1>
      <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
        Start free, upgrade when you need more. All plans include core care coordination features.
      </p>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <span className={cn("text-sm font-medium", !isAnnual && "text-foreground", isAnnual && "text-muted-foreground")}>
          Monthly
        </span>
        <Switch checked={isAnnual} onCheckedChange={onIsAnnualChange} aria-label="Toggle annual billing" />
        <span className={cn("text-sm font-medium", isAnnual && "text-foreground", !isAnnual && "text-muted-foreground")}>
          Annual
        </span>
        {isAnnual && (
          <Badge variant="success" className="ml-2">
            Save 25%
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
