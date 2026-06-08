import { AppShell } from "@/components/app-shell";
import { DocumentsScreen } from "@/components/documents";
import { getDocumentsData } from "@/lib/documents/queries";

// Server component: load the active circle's documents (RLS-filtered by sensitivity) and hand them
// to the client screen. Keyed by circle so switching circles in the sidebar remounts with fresh data.
export default async function DocumentsPage() {
  const initial = await getDocumentsData();
  return (
    <AppShell>
      <DocumentsScreen key={initial?.circleId ?? "no-circle"} initial={initial} />
    </AppShell>
  );
}
