import { AppShell } from "@/components/app-shell";
import { RotaScreen } from "@/components/rota";
import { getRotaData } from "@/lib/rota/queries";

// Server component: load the active circle's rota + members (RLS-scoped) and hand them to the
// client screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function RotaPage() {
  const initial = await getRotaData();
  return (
    <AppShell>
      <RotaScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
