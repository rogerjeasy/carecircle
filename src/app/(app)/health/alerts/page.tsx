import { AppShell } from "@/components/app-shell";
import { HealthAlertsScreen } from "@/components/health";
import { getAlertThresholds } from "@/lib/health/queries";

// Server component: load the circle's persisted safe ranges (RLS-scoped) so the panel edits the
// real values; saving goes through the saveAlertThresholds server action.
export default async function HealthAlertsPage() {
  const data = await getAlertThresholds();
  return (
    <AppShell>
      <HealthAlertsScreen key={data?.circleId ?? "no-circle"} initialThresholds={data?.thresholds} />
    </AppShell>
  );
}
