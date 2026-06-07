// Display constants for the Medications screen. The actual medications, doses, and PRN list are
// loaded from the server (see src/lib/medications/queries.ts) — this file only holds the static
// presentation metadata the components share.

import { Sun, Sunrise, Sunset, Moon } from "lucide-react";
import type { Period } from "./types";

export const LOW_SUPPLY_THRESHOLD = 7;
export const PERIOD_ORDER: Period[] = ["Morning", "Afternoon", "Evening", "Night"];

export const periodMeta: Record<Period, { icon: typeof Sun; tint: string }> = {
  Morning: { icon: Sunrise, tint: "text-warning" },
  Afternoon: { icon: Sun, tint: "text-warning" },
  Evening: { icon: Sunset, tint: "text-accent" },
  Night: { icon: Moon, tint: "text-info" },
};
