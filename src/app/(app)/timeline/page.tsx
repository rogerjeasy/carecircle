import { AppShell } from "@/components/app-shell";
import { TimelineScreen } from "@/components/timeline";
import { getTimelineData } from "@/lib/timeline/queries";

// Server component: load the active circle's real timeline feed (RLS-scoped) and hand it to the
// client screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function TimelinePage() {
  const initial = await getTimelineData();
  return (
    <AppShell>
      <TimelineScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
