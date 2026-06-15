// Display config for the Timeline. (The events themselves are loaded from the server — see
// src/lib/timeline/queries.ts. This file only holds static presentation metadata.)

import { Pill, HeartPulse, FileText, Calendar as CalendarIcon, AlertTriangle, Globe, Users, Lock } from "lucide-react";
import type { EventType, Visibility } from "./types";

// Event type config (med = teal, vital = blue, note = neutral, appointment = accent, incident = red).
// Labels resolved from messages (`timeline.types.<type>`).
export const eventTypeConfig: Record<EventType, { icon: typeof Pill; color: string }> = {
  med: { icon: Pill, color: "bg-primary/10 text-primary" },
  vital: { icon: HeartPulse, color: "bg-info/10 text-info" },
  note: { icon: FileText, color: "bg-muted text-muted-foreground" },
  appointment: { icon: CalendarIcon, color: "bg-accent/10 text-accent" },
  incident: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
};

// Filter chip ids (labels resolved via `timeline.filters.<id>`).
export const filterChips = [
  { id: "all" },
  { id: "med" },
  { id: "vital" },
  { id: "note" },
  { id: "appointment" },
  { id: "incident" },
] as const;

// Visibility options (label/description resolved via `timeline.visibility.<value>.*`).
export const visibilityOptions: { value: Visibility; icon: typeof Globe }[] = [
  { value: "everyone", icon: Globe },
  { value: "family", icon: Users },
  { value: "private", icon: Lock },
];

// Date-range presets for the filter bar (labels resolved via `timeline.ranges.<value>`).
export const dateRanges = [
  { value: "all" },
  { value: "7d" },
  { value: "30d" },
] as const;
