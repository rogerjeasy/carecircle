"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("pricing.hero");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="motion-reduce:animate-none"
    >
      <Badge variant="secondary" className="mb-4">
        {t("badge")}
      </Badge>
      <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-balance">
        {t.rich("title", { hl: (chunks) => <span className="text-primary">{chunks}</span> })}
      </h1>
      <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
        {t("subtitle")}
      </p>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <span className={cn("text-sm font-medium", !isAnnual && "text-foreground", isAnnual && "text-muted-foreground")}>
          {t("monthly")}
        </span>
        <Switch checked={isAnnual} onCheckedChange={onIsAnnualChange} aria-label={t("annual")} />
        <span className={cn("text-sm font-medium", isAnnual && "text-foreground", !isAnnual && "text-muted-foreground")}>
          {t("annual")}
        </span>
        {isAnnual && (
          <Badge variant="success" className="ml-2">
            {t("saveBadge")}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
