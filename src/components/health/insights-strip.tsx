"use client";

import { Sparkles, TrendingDown, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Insight, InsightTone } from "./utils";

const toneMeta: Record<InsightTone, { icon: typeof Sparkles; className: string }> = {
  positive: { icon: Sparkles, className: "bg-success/10 text-success" },
  warning: { icon: TriangleAlert, className: "bg-warning/10 text-warning" },
  info: { icon: TrendingDown, className: "bg-info/10 text-info" },
};

/** A subtle strip of decline-detection / reassurance insights. */
export function InsightsStrip({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <section aria-label="Insights" className="flex flex-wrap gap-2">
      {insights.map((insight) => {
        const meta = toneMeta[insight.tone];
        const Icon = meta.icon;
        return (
          <span
            key={insight.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
              meta.className
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {insight.text}
          </span>
        );
      })}
    </section>
  );
}
