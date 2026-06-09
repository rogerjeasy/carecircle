"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { statMeta } from "./data";
import type { DigestStat } from "./types";

/** A compact "by the numbers" strip: up to 4 real stats. 4-up on wide, 2×2 on tablet, stacked on phone. */
export function ByTheNumbers({ stats }: { stats: DigestStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        stats.length >= 4 ? "lg:grid-cols-4" : stats.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
      )}
    >
      {stats.map((s) => {
        const meta = statMeta[s.key];
        const Icon = meta.icon;
        return (
          <Card key={s.key} className="flex items-center gap-3 p-3 sm:p-3.5">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base", meta.tint)}>
              {s.emoji ? <span aria-hidden="true">{s.emoji}</span> : <Icon className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-none tabular-nums">{s.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{s.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
