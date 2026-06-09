"use client";

import { useAppShell } from "@/components/app-shell/app-shell-context";
import {
  CaregiverToday,
  RecipientHome,
  ReadonlyHome,
  ClinicianSummary,
} from "@/components/experiences";
import { CoordinatorDashboard } from "./coordinator-dashboard";
import type { DashboardData } from "./types";

/**
 * Renders the home experience scoped to the current role-view, threading the server-loaded,
 * circle-scoped data bundle into whichever experience the role selects. `initial` is null when the
 * user has no active circle yet — each experience then shows its built-in empty copy.
 */
export function DashboardHome({ initial }: { initial: DashboardData | null }) {
  const { role } = useAppShell();
  switch (role) {
    case "caregiver":
      return <CaregiverToday data={initial} />;
    case "care-recipient":
      return <RecipientHome data={initial} />;
    case "readonly":
      return <ReadonlyHome data={initial} />;
    case "clinician":
      return <ClinicianSummary data={initial} />;
    default:
      return <CoordinatorDashboard data={initial} />;
  }
}
