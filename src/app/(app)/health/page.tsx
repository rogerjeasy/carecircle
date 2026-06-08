import { AppShell } from "@/components/app-shell";
import { HealthScreen } from "@/components/health";
import { getHealthData } from "@/lib/health/queries";

// Server component: load the active circle's vitals + members (RLS-scoped) and hand them to the
// client screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function HealthPage() {
  const initial = await getHealthData();
  return (
    <AppShell>
      <HealthScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
