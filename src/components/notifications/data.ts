// Display constants for the Notifications center. The notifications themselves are real, derived
// from the circle's timeline activity (see src/lib/notifications/queries.ts).

import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  HeartPulse,
  MessageSquare,
  Pill,
  Sparkles,
} from "lucide-react";
import type { NotificationFilter, NotificationType } from "./types";

export const typeMeta: Record<NotificationType, { icon: typeof Pill; tint: string; label: string }> = {
  med: { icon: Pill, tint: "bg-primary/10 text-primary", label: "Medication" },
  vital: { icon: HeartPulse, tint: "bg-accent/10 text-accent", label: "Vital" },
  task: { icon: CheckSquare, tint: "bg-info/10 text-info", label: "Task" },
  incident: { icon: AlertTriangle, tint: "bg-destructive/10 text-destructive", label: "Incident" },
  mention: { icon: MessageSquare, tint: "bg-warning/10 text-warning", label: "Mention" },
  appointment: { icon: Calendar, tint: "bg-success/10 text-success", label: "Appointment" },
  digest: { icon: Sparkles, tint: "bg-primary/10 text-primary", label: "Digest" },
};

export const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mentions", label: "Mentions" },
  { value: "urgent", label: "Urgent" },
  { value: "tasks", label: "Tasks" },
];
