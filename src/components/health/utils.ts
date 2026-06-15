// Pure helpers shared across the Health screen.

import { differenceInCalendarDays } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import { MOOD_FACES, metricConfigs } from "./data";
import type {
  MetricKey,
  RangeKey,
  Reading,
  StatusLevel,
  ThresholdMap,
  Thresholds,
} from "./types";

/** Logging readings and editing alert ranges is open to caregiving roles; others view. */
export function canLogReadings(role: UserRole): boolean {
  return role !== "readonly";
}

export function canManageAlerts(role: UserRole): boolean {
  return role === "coordinator" || role === "family";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** The mood face entry for a 1–5 value. */
export function moodFace(value: number) {
  return MOOD_FACES.find((f) => f.value === Math.round(value)) ?? MOOD_FACES[2];
}

/** Format a reading's primary display value (e.g. "128/82", "76.0", "Good"). */
export function formatValue(metric: MetricKey, value: number, secondary?: number): string {
  if (metric === "bp") return `${Math.round(value)}/${Math.round(secondary ?? 0)}`;
  if (metric === "mood") return moodFace(value).label;
  return value.toFixed(metricConfigs[metric].decimals);
}

/** Evaluate a reading against thresholds → normal / elevated / low. */
export function statusOf(metric: MetricKey, value: number, secondary: number | undefined, thr: Thresholds): StatusLevel {
  if (!thr.enabled) return "normal";
  if (metric === "bp") {
    if (value >= thr.max || (secondary != null && thr.diaMax != null && secondary >= thr.diaMax)) return "elevated";
    if (value < thr.min || (secondary != null && thr.diaMin != null && secondary < thr.diaMin)) return "low";
    return "normal";
  }
  if (metric === "mood") return value < thr.min ? "low" : "normal";
  if (value > thr.max) return "elevated";
  if (value < thr.min) return "low";
  return "normal";
}

/** Readings for one metric within the chosen range, sorted oldest → newest. */
export function readingsFor(readings: Reading[], metric: MetricKey, range: RangeKey, now: Date): Reading[] {
  const days = RANGE_DAYS[range];
  return readings
    .filter((r) => r.metric === metric && differenceInCalendarDays(now, r.at) < days)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** The most recent reading for a metric (or undefined). */
export function latestReading(readings: Reading[], metric: MetricKey): Reading | undefined {
  return readings
    .filter((r) => r.metric === metric)
    .reduce<Reading | undefined>((best, r) => (!best || r.at > best.at ? r : best), undefined);
}

export interface Trend {
  dir: "up" | "down" | "flat";
  /** Signed delta of the primary value across the visible series. */
  delta: number;
  /** e.g. "+1.2 kg" / "−3 mmHg". */
  text: string;
}

/** Trend of the primary value across a (sorted) series. */
export function trendOf(metric: MetricKey, series: Reading[]): Trend | null {
  if (series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const delta = last - first;
  const dp = metricConfigs[metric].decimals;
  const mag = Math.abs(delta);
  const dir: Trend["dir"] = mag < 10 ** -dp / 2 || mag < (metric === "mood" ? 0.5 : 0.05) ? "flat" : delta > 0 ? "up" : "down";
  const unit = metricConfigs[metric].unit;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  // `text` is the signed magnitude only (e.g. "+1.2 kg"); the "Steady" word for a flat trend is
  // localized by the component (TrendIndicator) so it stays out of this server-safe util.
  const text = dir === "flat" ? "" : `${sign}${mag.toFixed(dp)}${unit ? " " + unit : ""}`;
  return { dir, delta, text };
}

export type InsightTone = "positive" | "warning" | "info";
/** Stable insight key → resolved to localized copy in the client via `health.insights.*`. */
export type InsightKey = "weightDown" | "weightUp" | "bpElevated" | "sleepBelow" | "sleepSteady" | "hrHealthy";
export interface Insight {
  id: string;
  tone: InsightTone;
  /** Pre-rendered English text (kept for server/dashboard use). */
  text: string;
  /** Message key + interpolation values for client-side localization. */
  key: InsightKey;
  vars: Record<string, string | number>;
}

/** Surface gentle decline-detection insights from the data. */
export function computeInsights(readings: Reading[], thr: ThresholdMap, now: Date): Insight[] {
  const insights: Insight[] = [];

  // Weight change over ~30 days.
  const weights = readings.filter((r) => r.metric === "weight").sort((a, b) => a.at.getTime() - b.at.getTime());
  if (weights.length) {
    const latest = weights[weights.length - 1];
    const past = weights.find((r) => differenceInCalendarDays(now, r.at) <= 30);
    if (past) {
      const delta = latest.value - past.value;
      if (Math.abs(delta) >= 1.5) {
        const kg = Math.abs(delta).toFixed(1);
        insights.push({
          id: "weight",
          tone: delta < 0 ? "info" : "warning",
          text: `Weight ${delta < 0 ? "down" : "up"} ${kg}kg over 30 days`,
          key: delta < 0 ? "weightDown" : "weightUp",
          vars: { kg },
        });
      }
    }
  }

  // Blood pressure elevated days in the last 7.
  const bp = readings.filter((r) => r.metric === "bp").sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 7);
  const elevated = bp.filter(
    (r) => r.value >= thr.bp.max || (r.secondary != null && thr.bp.diaMax != null && r.secondary >= thr.bp.diaMax)
  ).length;
  if (elevated >= 4) {
    insights.push({ id: "bp", tone: "warning", text: `BP elevated ${elevated} of last 7 days`, key: "bpElevated", vars: { n: elevated } });
  }

  // Sleep average over last 7 days.
  const sleep = readings.filter((r) => r.metric === "sleep" && differenceInCalendarDays(now, r.at) < 7);
  if (sleep.length) {
    const avg = sleep.reduce((s, r) => s + r.value, 0) / sleep.length;
    const h = avg.toFixed(1);
    if (avg < thr.sleep.min) {
      insights.push({ id: "sleep", tone: "warning", text: `Sleep averaging ${h}h — below target`, key: "sleepBelow", vars: { h } });
    } else {
      insights.push({ id: "sleep", tone: "positive", text: `Sleep steady around ${h}h 💚`, key: "sleepSteady", vars: { h } });
    }
  }

  // A reassuring note if nothing concerning surfaced.
  if (!insights.some((i) => i.tone === "warning")) {
    const hr = latestReadingValue(readings, "hr");
    if (hr != null) {
      const bpm = Math.round(hr);
      insights.push({ id: "hr", tone: "positive", text: `Resting heart rate looking healthy (${bpm} bpm)`, key: "hrHealthy", vars: { bpm } });
    }
  }

  return insights.slice(0, 4);
}

function latestReadingValue(readings: Reading[], metric: MetricKey): number | null {
  const r = latestReading(readings, metric);
  return r ? r.value : null;
}

/** Map a sorted series to recharts-friendly points. */
export interface ChartPoint {
  t: number;
  label: string;
  value: number;
  dia?: number;
}

export function toChartPoints(series: Reading[], locale: string): ChartPoint[] {
  return series.map((r) => ({
    t: r.at.getTime(),
    label: r.at.toLocaleDateString(locale, { month: "short", day: "numeric" }),
    value: r.value,
    dia: r.secondary,
  }));
}

/**
 * The numeric/date parts of a series, for the screen-reader summary (charts are aria-hidden). The
 * component combines these with the localized metric name + message (`health.series.summary`).
 */
export interface SeriesParts {
  count: number;
  from: string;
  to: string;
  lo: number;
  hi: number;
}

export function seriesParts(series: Reading[], locale: string): SeriesParts {
  const md = (d: Date) => d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  return {
    count: series.length,
    from: md(series[0].at),
    to: md(series[series.length - 1].at),
    lo: Math.min(...series.map((r) => r.value)),
    hi: Math.max(...series.map((r) => r.value)),
  };
}
