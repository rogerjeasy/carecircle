// Display constants for the Incidents feature (icons, tints, badges). Incident records, members and
// contacts are real data loaded from the server (see src/lib/incidents/*).

import { AlertCircle, Ambulance, PersonStanding, Siren } from "lucide-react";
import type { IncidentType, Severity } from "./types";

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
