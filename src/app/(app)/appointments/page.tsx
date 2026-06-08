import { AppShell } from "@/components/app-shell";
import { AppointmentsScreen } from "@/components/appointments";
import { getAppointmentsData } from "@/lib/appointments/queries";

// Server component: load the active circle's appointments + members (RLS-scoped) and hand them to
// the client screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function AppointmentsPage() {
  const initial = await getAppointmentsData();
  return (
    <AppShell>
      <AppointmentsScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
