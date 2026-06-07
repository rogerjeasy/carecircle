import { AppShell } from "@/components/app-shell";
import { MedicationsScreen } from "@/components/medications";
import { getMedicationsData } from "@/lib/medications/queries";

// Server component: load the active circle's real medications, today's doses, PRN list, and
// weekly adherence (all RLS-scoped) and hand them to the client screen as one prop. When there's
// no data (or no circle yet) the screen renders its built-in empty states.
export default async function MedicationsPage() {
  const initial = await getMedicationsData();
  return (
    <AppShell>
      {/* Keyed by the active circle so switching circles in the sidebar remounts the screen with
          the new circle's data (fresh client state — no stale list from the previous circle). */}
      <MedicationsScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
