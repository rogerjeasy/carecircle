"use client";

import { Activity, HeartPulse, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { moodMeta } from "./data";
import type { ByNumbers } from "./types";

/** A compact "by the numbers" strip: 4-up on wide, 2×2 on tablet, stacked on phone. */
export function ByTheNumbers({ numbers }: { numbers: ByNumbers }) {
  const mood = moodMeta[numbers.mood];
  const items = [
    { icon: Pill, label: "Meds given", value: `${numbers.medsGiven}/${numbers.medsTotal}`, tint: "bg-primary/10 text-primary" },
    { icon: HeartPulse, label: "Blood pressure", value: numbers.bp, tint: "bg-accent/10 text-accent" },
    { icon: Activity, label: "Steps", value: numbers.steps.toLocaleString(), tint: "bg-info/10 text-info" },
    { icon: null, label: "Mood", value: mood.label, emoji: mood.emoji, tint: "bg-success/10 text-success" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="flex items-center gap-3 p-3 sm:p-3.5">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base", item.tint)}>
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : <span aria-hidden="true">{item.emoji}</span>}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-none tabular-nums">{item.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
