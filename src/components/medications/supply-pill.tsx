import { PillBottle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LOW_SUPPLY_THRESHOLD } from "./data";
import { supplyTone } from "./utils";

/** Compact "days of supply" pill that recolours when supply runs low. */
export function SupplyPill({ days }: { days: number }) {
  const t = useTranslations("medications");
  const low = days <= LOW_SUPPLY_THRESHOLD;
  const tone = supplyTone(days);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone.pillClassName
      )}
    >
      <PillBottle className="h-3 w-3" aria-hidden="true" />
      <span className="tabular-nums">{t("supply.days", { days })}</span>
      <span className="sr-only">{low ? t("supply.ariaLow") : t("supply.aria")}</span>
    </span>
  );
}
