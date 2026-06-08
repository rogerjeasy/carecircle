import { AppShell } from "@/components/app-shell";
import { TasksScreen } from "@/components/tasks";
import { getTasksData } from "@/lib/tasks/queries";

// Server component: load the active circle's tasks + members (RLS-scoped) and hand them to the
// client screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function TasksPage() {
  const initial = await getTasksData();
  return (
    <AppShell>
      <TasksScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
