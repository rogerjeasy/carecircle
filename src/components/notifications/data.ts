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

// Display metadata only — type labels are localized in the component via `notifications.types.<type>`.
export const typeMeta: Record<NotificationType, { icon: typeof Pill; tint: string }> = {
  med: { icon: Pill, tint: "bg-primary/10 text-primary" },
  vital: { icon: HeartPulse, tint: "bg-accent/10 text-accent" },
  task: { icon: CheckSquare, tint: "bg-info/10 text-info" },
  incident: { icon: AlertTriangle, tint: "bg-destructive/10 text-destructive" },
  mention: { icon: MessageSquare, tint: "bg-warning/10 text-warning" },
  appointment: { icon: Calendar, tint: "bg-success/10 text-success" },
  digest: { icon: Sparkles, tint: "bg-primary/10 text-primary" },
};

// Filter values only — labels are localized in the component via `notifications.filters.<value>`.
export const FILTERS: { value: NotificationFilter }[] = [
  { value: "all" },
  { value: "mentions" },
  { value: "urgent" },
  { value: "tasks" },
];
