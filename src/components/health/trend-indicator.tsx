"use client";

import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trend } from "./utils";

/** A small, neutral trend arrow + delta text (e.g. "↗ +1.2 kg"). */
export function TrendIndicator({ trend, className }: { trend: Trend | null; className?: string }) {
  const t = useTranslations("health");
  if (!trend) return null;
  const Icon = trend.dir === "up" ? ArrowUpRight : trend.dir === "down" ? ArrowDownRight : Minus;
  // `trend.text` is the localized-neutral signed magnitude ("+1.2 kg"); "Steady" comes from messages.
  const text = trend.dir === "flat" ? t("trend.steady") : trend.text;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground", className)}
      aria-label={text}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </span>
  );
}
