import { AppShell } from "@/components/app-shell";
import { IncidentDetailView } from "@/components/incidents";

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <IncidentDetailView id={id} />
    </AppShell>
  );
}
