"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ReadingsTable } from "./readings-table";
import { useReducedMotion } from "./use-reduced-motion";
import { METRIC_ORDER, metricConfigs, metricIcons } from "./data";
import { formatValue, moodFace, readingsFor, seriesParts, toChartPoints } from "./utils";
import type { MetricKey, RangeKey, Reading, ThresholdMap } from "./types";

export interface FocusChartProps {
  metric: MetricKey;
  onSelectMetric: (m: MetricKey) => void;
  readings: Reading[];
  range: RangeKey;
  thresholds: ThresholdMap;
  now: Date;
}

/** The larger focus chart (default Blood pressure) + a readings table beneath it. */
export function FocusChart({ metric, onSelectMetric, readings, range, thresholds, now }: FocusChartProps) {
  const t = useTranslations("health");
  const locale = useLocale();
  const reduced = useReducedMotion();
  const cfg = metricConfigs[metric];
  const thr = thresholds[metric];
  const metricName = t(`metrics.${metric}` as "metrics.bp");
  const series = readingsFor(readings, metric, range, now);
  const points = toChartPoints(series, locale);
  const paired = Boolean(cfg.paired);
  const summary =
    series.length === 0
      ? t("series.none")
      : (() => {
          const last = series[series.length - 1];
          const p = seriesParts(series, locale);
          const latestLabel =
            metric === "mood"
              ? t(`mood.${moodFace(last.value).value}` as "mood.3")
              : `${formatValue(metric, last.value, last.secondary)}${cfg.unit ? ` ${cfg.unit}` : ""}`;
          return t("series.summary", { name: metricName, count: p.count, from: p.from, to: p.to, latest: latestLabel, lo: p.lo, hi: p.hi });
        })();

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* Metric selector */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{metricName}</h2>
            <p className="text-xs text-muted-foreground">{t("chart.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("chart.focusMetric")}>
            {METRIC_ORDER.map((m) => {
              const Icon = metricIcons[m];
              const active = m === metric;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectMetric(m)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{t(`metrics.${m}` as "metrics.bp")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div className="h-[260px] w-full sm:h-[300px]" aria-hidden="true">
          {points.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">{t("chart.noReadingsRange")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  minTickGap={36}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  domain={metric === "mood" ? [1, 5] : ["auto", "auto"]}
                  allowDecimals={cfg.decimals > 0}
                />
                {thr.enabled && (
                  <ReferenceArea
                    y1={thr.min}
                    y2={thr.max}
                    fill="hsl(var(--success))"
                    fillOpacity={0.08}
                    ifOverflow="extendDomain"
                  />
                )}
                <Tooltip content={<ChartTooltip metric={metric} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={paired ? t("chart.systolic") : metricName}
                  stroke={cfg.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={!reduced}
                />
                {paired && (
                  <Line
                    type="monotone"
                    dataKey="dia"
                    name={t("chart.diastolic")}
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!reduced}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend + a11y summary */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full" style={{ backgroundColor: cfg.color }} aria-hidden="true" />
            {paired ? t("chart.systolic") : metricName}
          </span>
          {paired && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} aria-hidden="true" />
              {t("chart.diastolic")}
            </span>
          )}
          {thr.enabled && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-success/20" aria-hidden="true" />
              {paired
                ? t("chart.normalRangeSys", { min: thr.min, max: thr.max })
                : t("chart.normalRange", { min: thr.min, max: thr.max })}
            </span>
          )}
        </div>
        <p className="sr-only">{summary}</p>

        {/* Readings table */}
        <div className="pt-1">
          <h3 className="mb-2 text-sm font-semibold">{t("chart.readings")}</h3>
          <ReadingsTable metric={metric} series={series} thresholds={thr} />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  metric,
  active,
  payload,
  label,
}: {
  metric: MetricKey;
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const cfg = metricConfigs[metric];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
          {p.name}: <span className="font-medium text-foreground">{p.value}</span>
          {cfg.unit && !cfg.paired ? ` ${cfg.unit}` : ""}
        </p>
      ))}
    </div>
  );
}
