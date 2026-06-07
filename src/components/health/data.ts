// Demo seed data + display constants for the Health screen.

import { Droplet, Heart, HeartPulse, Moon, Scale, Smile } from "lucide-react";
import { addDays, startOfDay } from "date-fns";
import type { MetricConfig, MetricKey, Member, Reading, ThresholdMap } from "./types";

/** Who's being cared for (used in copy). */
export const CARE_RECIPIENT = { name: "Antonio" } as const;

export const MEMBERS: Member[] = [
  { id: "grace", name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary" },
  { id: "maria", name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent" },
  { id: "paolo", name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info" },
  { id: "carlos", name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success" },
];

export const METRIC_ORDER: MetricKey[] = ["bp", "glucose", "weight", "sleep", "mood", "hr"];

export const metricConfigs: Record<MetricKey, MetricConfig> = {
  bp: { key: "bp", name: "Blood pressure", unit: "mmHg", color: "hsl(var(--chart-1))", tint: "bg-primary/10 text-primary", decimals: 0, paired: true },
  glucose: { key: "glucose", name: "Glucose", unit: "mg/dL", color: "hsl(var(--chart-4))", tint: "bg-warning/10 text-warning", decimals: 0 },
  weight: { key: "weight", name: "Weight", unit: "kg", color: "hsl(var(--chart-3))", tint: "bg-success/10 text-success", decimals: 1 },
  sleep: { key: "sleep", name: "Sleep", unit: "h", color: "hsl(var(--chart-5))", tint: "bg-info/10 text-info", decimals: 1 },
  mood: { key: "mood", name: "Mood", unit: "", color: "hsl(var(--chart-2))", tint: "bg-accent/10 text-accent", decimals: 0 },
  hr: { key: "hr", name: "Resting HR", unit: "bpm", color: "hsl(var(--chart-1))", tint: "bg-primary/10 text-primary", decimals: 0 },
};

export const metricIcons: Record<MetricKey, typeof HeartPulse> = {
  bp: HeartPulse,
  glucose: Droplet,
  weight: Scale,
  sleep: Moon,
  mood: Smile,
  hr: Heart,
};

/** The 5-point mood scale (value → face + label). */
export const MOOD_FACES = [
  { value: 1, emoji: "😣", label: "Very low" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

/** Default alert thresholds (also the starting values for the Health alerts settings panel). */
export const DEFAULT_THRESHOLDS: ThresholdMap = {
  bp: { enabled: true, min: 90, max: 140, diaMin: 60, diaMax: 90 },
  glucose: { enabled: true, min: 70, max: 140 },
  weight: { enabled: false, min: 65, max: 82 },
  sleep: { enabled: true, min: 6, max: 9 },
  mood: { enabled: true, min: 3, max: 5 },
  hr: { enabled: true, min: 50, max: 90 },
};

const RECORDERS = ["grace", "maria", "paolo", "carlos"];

// Recent 7 days of BP, hand-picked so "elevated 5 of last 7 days" holds (systolic ≥ 140 five times).
const BP_SYS_RECENT = [142, 141, 144, 143, 140, 136, 138];
const BP_DIA_RECENT = [90, 88, 91, 89, 87, 85, 88];

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Value generator per metric, where `d` = days ago (0 = today). */
function valueFor(metric: MetricKey, d: number): { value: number; secondary?: number } {
  switch (metric) {
    case "bp":
      if (d < 7) return { value: BP_SYS_RECENT[d], secondary: BP_DIA_RECENT[d] };
      return { value: 126 + Math.round(5 * Math.sin(d / 3)), secondary: 80 + Math.round(4 * Math.sin(d / 4)) };
    case "glucose":
      return { value: 112 + Math.round(16 * Math.sin(d / 2.5)) };
    case "weight":
      // Drifts ~2kg down over the last 30 days (now ≈ 76.0, 30 days ago ≈ 78.0).
      return { value: round(76 + (d / 30) * 2 + 0.3 * Math.sin(d / 2), 1) };
    case "sleep":
      return { value: round(7 + 1.1 * Math.sin(d / 2), 1) };
    case "mood":
      return { value: Math.max(1, Math.min(5, Math.round(4 + Math.sin(d / 3)))) };
    case "hr":
      return { value: 64 + Math.round(8 * Math.sin(d / 2.2)) };
  }
}

const METRIC_HOUR: Record<MetricKey, number> = { bp: 8, glucose: 8, weight: 7, sleep: 7, mood: 20, hr: 8 };

/** Build 90 days of daily readings for every metric, dated relative to `now`. */
export function buildReadings(now: Date, days = 90): Reading[] {
  const out: Reading[] = [];
  for (const metric of METRIC_ORDER) {
    for (let d = days - 1; d >= 0; d--) {
      const at = addDays(startOfDay(now), -d);
      at.setHours(METRIC_HOUR[metric], 0, 0, 0);
      const { value, secondary } = valueFor(metric, d);
      out.push({
        id: `${metric}-${d}`,
        metric,
        at,
        value,
        secondary,
        recordedBy: RECORDERS[(d + METRIC_ORDER.indexOf(metric)) % RECORDERS.length],
        note: d === 0 && metric === "bp" ? "Measured after morning walk." : undefined,
      });
    }
  }
  return out;
}
