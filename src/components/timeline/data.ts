// Display config for the Timeline. (The events themselves are loaded from the server — see
// src/lib/timeline/queries.ts. This file only holds static presentation metadata.)

import { Pill, HeartPulse, FileText, Calendar as CalendarIcon, AlertTriangle, Globe, Users, Lock } from "lucide-react";
import type { EventType, Visibility } from "./types";

// Event type config (med = teal, vital = blue, note = neutral, appointment = accent, incident = red).
export const eventTypeConfig: Record<EventType, { icon: typeof Pill; color: string; label: string }> = {
  med: { icon: Pill, color: "bg-primary/10 text-primary", label: "Medication" },
  vital: { icon: HeartPulse, color: "bg-info/10 text-info", label: "Vital" },
  note: { icon: FileText, color: "bg-muted text-muted-foreground", label: "Note" },
  appointment: { icon: CalendarIcon, color: "bg-accent/10 text-accent", label: "Appointment" },
  incident: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive", label: "Incident" },
};

// Filter chips
export const filterChips = [
  { id: "all", label: "All" },
  { id: "med", label: "Meds" },
  { id: "vital", label: "Vitals" },
  { id: "note", label: "Notes" },
  { id: "appointment", label: "Appointments" },
  { id: "incident", label: "Incidents" },
] as const;

// Visibility options
export const visibilityOptions: { value: Visibility; label: string; icon: typeof Globe; description: string }[] = [
  { value: "everyone", label: "Everyone", icon: Globe, description: "Visible to all circle members" },
  { value: "family", label: "Family only", icon: Users, description: "Only family members can see" },
  { value: "private", label: "Private", icon: Lock, description: "Only you and coordinators" },
];

// Date-range presets for the filter bar.
export const dateRanges = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
] as const;
