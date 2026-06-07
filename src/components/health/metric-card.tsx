"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Sparkline } from "./sparkline";
import { StatusPill } from "./status-pill";
import { TrendIndicator } from "./trend-indicator";
import { metricConfigs, metricIcons } from "./data";
import {
  formatValue,
  moodFace,
  readingsFor,
  seriesSummary,
  statusOf,
  toChartPoints,
  trendOf,
} from "./utils";
import type { MetricKey, RangeKey, Reading, Thresholds } from "./types";

export interface MetricCardProps {
  metric: MetricKey;
  readings: Reading[];
  range: RangeKey;
  thresholds: Thresholds;
  now: Date;
  selected: boolean;
  onSelect: () => void;
}

/** A metric summary card: name, latest value, status pill, trend arrow, and an embedded sparkline. */
export function MetricCard({ metric, readings, range, thresholds, now, selected, onSelect }: MetricCardProps) {
  const cfg = metricConfigs[metric];
  const Icon = metricIcons[metric];
  const series = readingsFor(readings, metric, range, now);
  const latest = series[series.length - 1];
  const status = latest ? statusOf(metric, latest.value, latest.secondary, thresholds) : "normal";
  const trend = trendOf(metric, series);
  const points = toChartPoints(series);

  return (
    <Card
      className={cn(
        "p-0 transition-shadow",
        status === "elevated" && "border-warning/40 bg-warning/5",
        status === "low" && "border-info/40 bg-info/5",
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        aria-pressed={selected}
        aria-label={`Focus ${cfg.name} chart`}
        className="flex w-full cursor-pointer flex-col gap-3 rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", cfg.tint)}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{cfg.name}</span>
          </div>
          <StatusPill status={status} className="shrink-0" />
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {latest ? (
              metric === "mood" ? (
                <p className="flex items-center gap-2 text-2xl font-bold leading-none">
                  <span aria-hidden="true">{moodFace(latest.value).emoji}</span>
                  <span className="text-xl">{moodFace(latest.value).label}</span>
                </p>
              ) : (
                <p className="text-2xl font-bold leading-none tabular-nums sm:text-3xl">
                  {formatValue(metric, latest.value, latest.secondary)}
                  {cfg.unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{cfg.unit}</span>}
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">No readings yet</p>
            )}
          </div>
          <TrendIndicator trend={trend} className="shrink-0 pb-0.5" />
        </div>

        <Sparkline data={points} color={cfg.color} />
        <span className="sr-only">{seriesSummary(metric, series)}</span>
      </div>
    </Card>
  );
}
