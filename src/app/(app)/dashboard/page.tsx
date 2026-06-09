import { AppShell } from "@/components/app-shell";
import { DashboardHome } from "@/components/dashboard";
import { getDashboardData } from "@/lib/dashboard/queries";

// Server component: load the active circle's whole dashboard bundle (RLS-scoped) and hand it to the
// role-aware client home. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function DashboardPage() {
  const initial = await getDashboardData();
  return (
    <AppShell>
      <DashboardHome key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
