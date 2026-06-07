"use client";

import { useAppShell } from "@/components/app-shell/app-shell-context";
import {
  CaregiverToday,
  RecipientHome,
  ReadonlyHome,
  ClinicianSummary,
} from "@/components/experiences";
import { CoordinatorDashboard } from "./coordinator-dashboard";

/** Renders the home experience scoped to the current role-view. */
export function DashboardHome() {
  const { role } = useAppShell();
  switch (role) {
    case "caregiver":
      return <CaregiverToday />;
    case "care-recipient":
      return <RecipientHome />;
    case "readonly":
      return <ReadonlyHome />;
    case "clinician":
      return <ClinicianSummary />;
    default:
      return <CoordinatorDashboard />;
  }
}
