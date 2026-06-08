import { AppShell } from "@/components/app-shell";
import { EmergencyCardScreen } from "@/components/profile";
import { getEmergencyCardData } from "@/lib/emergency-card/queries";

// Server component: project the active circle's recipient profile + active meds + contacts into the
// Emergency Card (RLS-scoped). Keyed by circle so switching circles remounts with fresh data.
export default async function EmergencyCardPage() {
  const data = await getEmergencyCardData();
  return (
    <AppShell>
      <EmergencyCardScreen key={data?.fullName ?? "none"} data={data} />
    </AppShell>
  );
}
