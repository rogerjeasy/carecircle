// Demo seed data + display constants for the Notifications center.

import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  HeartPulse,
  MessageSquare,
  Pill,
  Sparkles,
} from "lucide-react";
import type { Actor, NotificationFilter, NotificationSeed, NotificationType } from "./types";

const ACTORS: Record<string, Actor> = {
  grace: { id: "grace", name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary" },
  maria: { id: "maria", name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent" },
  paolo: { id: "paolo", name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info" },
  carlos: { id: "carlos", name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success" },
};

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

const seed: NotificationSeed[] = [
  { id: "n1", type: "incident", urgent: true, actor: ACTORS.grace, summary: "Fall reported — needs attention", href: "/incidents/inc-fall-1", minutesAgo: 18, read: false },
  { id: "n2", type: "med", urgent: false, actor: ACTORS.grace, summary: "Grace gave Antonio's evening meds", href: "/medications", minutesAgo: 45, read: false },
  { id: "n3", type: "mention", urgent: false, actor: ACTORS.maria, summary: "Maria mentioned you: “Can you take Tuesday?”", href: "/timeline", minutesAgo: 90, read: false },
  { id: "n4", type: "task", urgent: false, actor: ACTORS.paolo, summary: "Paolo completed “Order refill”", href: "/tasks", minutesAgo: 140, read: true },
  { id: "n5", type: "vital", urgent: false, actor: ACTORS.grace, summary: "Blood pressure logged: 128/82", href: "/health", minutesAgo: 220, read: true },
  { id: "n6", type: "appointment", urgent: false, actor: ACTORS.maria, summary: "Cardiology follow-up confirmed for Tue", href: "/appointments", minutesAgo: 300, read: false },
  { id: "n7", type: "task", urgent: false, actor: ACTORS.carlos, summary: "Carlos assigned you “Buy groceries”", href: "/tasks", minutesAgo: 26 * 60, read: true },
  { id: "n8", type: "digest", urgent: false, summary: "Yesterday's digest is ready", href: "/digest", minutesAgo: 30 * 60, read: true },
  { id: "n9", type: "mention", urgent: false, actor: ACTORS.carlos, summary: "Carlos replied to your note", href: "/timeline", minutesAgo: 34 * 60, read: true },
  { id: "n10", type: "med", urgent: false, actor: ACTORS.grace, summary: "Morning meds given on time", href: "/medications", minutesAgo: 50 * 60, read: true },
];

/** Resolve the seed into dated notifications relative to `now`. */
export function buildNotifications(now: Date) {
  return seed.map(({ minutesAgo, ...rest }) => ({
    ...rest,
    at: new Date(now.getTime() - minutesAgo * 60_000),
  }));
}
