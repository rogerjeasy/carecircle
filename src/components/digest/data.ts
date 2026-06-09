// Display constants for the Daily Digest (icons, tints, labels). Digest content itself is
// generated server-side from real data — see src/lib/digest.

import {
  Activity,
  Calendar,
  CheckCircle2,
  Droplet,
  HeartPulse,
  Moon,
  Pill,
  Scale,
  Smile,
} from "lucide-react";
import type { MoodKey, SourceType, StatKey } from "./types";

/** Who the digest is sent to + when (shown in the settings popover; managed in Settings). */
export const DIGEST_SETTINGS = {
  time: "8:00 PM",
  cadence: "Every evening",
} as const;

export const moodMeta: Record<MoodKey, { label: string; emoji: string; tint: string }> = {
  great: { label: "Great", emoji: "😄", tint: "text-success" },
  good: { label: "Good", emoji: "🙂", tint: "text-success" },
  okay: { label: "Okay", emoji: "😐", tint: "text-warning" },
  low: { label: "Low", emoji: "😕", tint: "text-info" },
};

export const sourceIcon: Record<SourceType, typeof Pill> = {
  med: Pill,
  vital: HeartPulse,
  note: Smile,
  appointment: Calendar,
  activity: Activity,
  meal: Smile,
};

/** Icon + tint for each "by the numbers" stat. */
export const statMeta: Record<StatKey, { icon: typeof Pill; tint: string }> = {
  meds: { icon: Pill, tint: "bg-primary/10 text-primary" },
  bp: { icon: HeartPulse, tint: "bg-accent/10 text-accent" },
  sleep: { icon: Moon, tint: "bg-info/10 text-info" },
  glucose: { icon: Droplet, tint: "bg-info/10 text-info" },
  weight: { icon: Scale, tint: "bg-info/10 text-info" },
  hr: { icon: Activity, tint: "bg-accent/10 text-accent" },
  mood: { icon: Smile, tint: "bg-success/10 text-success" },
  tasks: { icon: CheckCircle2, tint: "bg-primary/10 text-primary" },
  appointments: { icon: Calendar, tint: "bg-info/10 text-info" },
};
