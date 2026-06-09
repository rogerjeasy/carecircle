import { AppShell } from "@/components/app-shell";
import { IncidentsScreen } from "@/components/incidents";
import { getIncidentsData } from "@/lib/incidents/queries";

// Server component: load the active circle's incidents (RLS-scoped) and hand them to the client
// screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function IncidentsPage() {
  const initial = await getIncidentsData();
  return (
    <AppShell>
      <IncidentsScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
