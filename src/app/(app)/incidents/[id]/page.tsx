import { AppShell } from "@/components/app-shell";
import { IncidentDetailView } from "@/components/incidents";
import { getIncidentDetail } from "@/lib/incidents/queries";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getIncidentDetail(id);
  return (
    <AppShell>
      <IncidentDetailView data={data} />
    </AppShell>
  );
}
