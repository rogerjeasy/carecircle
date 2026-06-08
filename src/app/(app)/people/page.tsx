import { AppShell } from "@/components/app-shell";
import { PeopleScreen } from "@/components/people";
import { getPeopleData } from "@/lib/people/queries";

// Server component: load the active circle's members + pending invites (RLS-scoped) and hand them
// to the client screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function PeoplePage() {
  const initial = await getPeopleData();
  return (
    <AppShell>
      <PeopleScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
