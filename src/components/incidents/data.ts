// Demo seed data + display constants for the Incidents feature.

import { AlertCircle, Ambulance, PersonStanding, Siren } from "lucide-react";
import { subDays, subHours, subMinutes } from "date-fns";
import type { IncidentType, Member, Severity } from "./types";

export const CARE_RECIPIENT = { name: "Antonio" } as const;

/** The contact to call in an emergency (surfaced for high-severity incidents). */
export const EMERGENCY_CONTACT = {
  name: "Maria Rodriguez",
  relation: "Primary contact · daughter",
  phone: "+1 (555) 204-1180",
} as const;

export const MEMBERS: Member[] = [
  { id: "maria", name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent", roleLabel: "Coordinator" },
  { id: "carlos", name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success", roleLabel: "Family Admin" },
  { id: "lucia", name: "Lucia Rossi", initials: "LR", color: "bg-warning/10 text-warning", roleLabel: "Family" },
  { id: "grace", name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary", roleLabel: "Caregiver" },
  { id: "paolo", name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info", roleLabel: "Caregiver" },
];

/** Members notified by default ("all coordinators + family", plus the primary carer). */
export const DEFAULT_NOTIFY_IDS = ["maria", "carlos", "lucia", "paolo"];

export const typeMeta: Record<
  IncidentType,
  { label: string; icon: typeof Siren; blurb: string; tint: string }
> = {
  fall: { label: "Fall", icon: PersonStanding, blurb: "A slip, trip or fall", tint: "bg-info/10 text-info" },
  hospitalization: { label: "Hospitalization", icon: Ambulance, blurb: "Admitted or taken to hospital", tint: "bg-accent/10 text-accent" },
  emergency: { label: "Emergency", icon: Siren, blurb: "Urgent, needs attention now", tint: "bg-destructive/10 text-destructive" },
  other: { label: "Other", icon: AlertCircle, blurb: "Something else worth noting", tint: "bg-muted text-muted-foreground" },
};

export const severityMeta: Record<
  Severity,
  { label: string; badge: "secondary" | "warning" | "destructive"; tint: string; ring: string }
> = {
  low: { label: "Low", badge: "secondary", tint: "text-muted-foreground", ring: "" },
  medium: { label: "Medium", badge: "warning", tint: "text-warning", ring: "" },
  high: { label: "High", badge: "destructive", tint: "text-destructive", ring: "ring-1 ring-destructive/30" },
};

/** Build a couple of demo incidents relative to `now` (used to seed the store). */
export function buildDemoIncidents(now: Date) {
  return [
    {
      id: "inc-fall-1",
      type: "fall" as IncidentType,
      severity: "medium" as Severity,
      description:
        "Antonio stumbled getting out of bed this morning. Grace was present and helped steady him. No visible injuries — he was wearing his non-slip socks. Monitoring through the day.",
      at: subHours(now, 5),
      reporterId: "grace",
      status: "open" as const,
      notifications: [
        { memberId: "maria", status: "acknowledged" as const, at: subHours(now, 4) },
        { memberId: "carlos", status: "seen" as const, at: subHours(now, 4) },
        { memberId: "lucia", status: "pending" as const },
        { memberId: "paolo", status: "acknowledged" as const, at: subHours(now, 3) },
      ],
      comments: [
        { id: "c1", authorId: "maria", text: "Thanks Grace. Should we consider a bed rail?", at: subHours(now, 4) },
        { id: "c2", authorId: "grace", text: "I think it's worth it. I'll keep him in sight this afternoon.", at: subMinutes(now, 200) },
      ],
    },
    {
      id: "inc-hosp-1",
      type: "hospitalization" as IncidentType,
      severity: "high" as Severity,
      description:
        "Antonio was taken to City General for chest tightness last month. Discharged after observation; cardiology follow-up arranged.",
      at: subDays(now, 34),
      reporterId: "maria",
      status: "resolved" as const,
      notifications: [
        { memberId: "maria", status: "acknowledged" as const, at: subDays(now, 34) },
        { memberId: "carlos", status: "acknowledged" as const, at: subDays(now, 34) },
        { memberId: "lucia", status: "seen" as const, at: subDays(now, 33) },
        { memberId: "paolo", status: "acknowledged" as const, at: subDays(now, 34) },
      ],
      comments: [
        { id: "c1", authorId: "carlos", text: "On my way to the hospital now.", at: subDays(now, 34) },
      ],
      resolutionNote: "Discharged the same evening. Stable. Cardiology follow-up booked with Dr. Chen.",
      resolvedAt: subDays(now, 33),
      resolvedById: "maria",
    },
  ];
}
