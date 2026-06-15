// Display constants for the Incidents feature (icons, tints, badges). Incident records, members and
// contacts are real data loaded from the server (see src/lib/incidents/*).
// Text labels/blurbs are resolved from messages in the components:
//   types: `incidents.types.<type>.{label,blurb}`
//   severities: `incidents.severities.<severity>`
//   ack statuses: `incidents.ack.<status>`

import { AlertCircle, Ambulance, PersonStanding, Siren } from "lucide-react";
import type { IncidentType, Severity } from "./types";

export const typeMeta: Record<
  IncidentType,
  { icon: typeof Siren; tint: string }
> = {
  fall: { icon: PersonStanding, tint: "bg-info/10 text-info" },
  hospitalization: { icon: Ambulance, tint: "bg-accent/10 text-accent" },
  emergency: { icon: Siren, tint: "bg-destructive/10 text-destructive" },
  other: { icon: AlertCircle, tint: "bg-muted text-muted-foreground" },
};

export const severityMeta: Record<
  Severity,
  { badge: "secondary" | "warning" | "destructive"; tint: string; ring: string }
> = {
  low: { badge: "secondary", tint: "text-muted-foreground", ring: "" },
  medium: { badge: "warning", tint: "text-warning", ring: "" },
  high: { badge: "destructive", tint: "text-destructive", ring: "ring-1 ring-destructive/30" },
};
