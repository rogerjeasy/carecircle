import { PillBottle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOW_SUPPLY_THRESHOLD } from "./data";
import { supplyTone } from "./utils";

/** Compact "days of supply" pill that recolours when supply runs low. */
export function SupplyPill({ days }: { days: number }) {
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
      <span className="tabular-nums">{days}d</span>
      <span className="sr-only">days of supply{low ? ", low" : ""}</span>
    </span>
  );
}
