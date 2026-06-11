import { AppShell } from "@/components/app-shell";
import { EmergencyCardScreen } from "@/components/profile";
import { getEmergencyCardData } from "@/lib/emergency-card/queries";
import { getActiveEmergencyShare } from "@/lib/emergency-card/share";

// Server component: project the active circle's recipient profile + active meds + contacts into the
// Emergency Card (RLS-scoped), plus the live public share link (the QR). Keyed by circle so
// switching circles remounts with fresh data.
export default async function EmergencyCardPage() {
  const [data, share] = await Promise.all([getEmergencyCardData(), getActiveEmergencyShare()]);
  return (
    <AppShell>
      <EmergencyCardScreen
        key={data?.fullName ?? "none"}
        data={data}
        share={
          share
            ? { url: share.url, expiresAt: share.expiresAt.toISOString(), viewCount: share.viewCount }
            : null
        }
      />
    </AppShell>
  );
}
