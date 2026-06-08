// Display constants for the Health screen. The readings + members are loaded from the server
// (see src/lib/health/queries.ts) — this file only holds static presentation metadata + the
// default alert thresholds.

import { Droplet, Heart, HeartPulse, Moon, Scale, Smile } from "lucide-react";
import type { MetricConfig, MetricKey, ThresholdMap } from "./types";

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
