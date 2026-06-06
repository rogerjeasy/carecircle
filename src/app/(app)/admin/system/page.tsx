import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requirePlatformAdmin } from "@/db/dal";
import { isPlatformDbConfigured } from "@/db/admin-db";
import { getSystemHealth } from "@/lib/admin/system-health";
import { getSafetyAlerts } from "@/db/admin-queries";
import { AdminPageHeader, DemoFootnote } from "@/components/admin/sections";
import { AdminSystemLive } from "@/components/admin/admin-system-live";
import type { SafetyData } from "@/lib/admin/system-types";

export const metadata = { title: "System · CareCircle Admin" };

// Health is live — render fresh on every request (no static caching).
export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  // Defense-in-depth: the /admin layout already gates this, but the page re-checks before it runs
  // any privileged cross-tenant read, and uses the admin identity to audit the safety-alert access.
  const admin = await requirePlatformAdmin();

  // First snapshot rendered server-side so there's no loading flash; the client then keeps polling.
  const [initialHealth, initialSafety] = await Promise.all([
    getSystemHealth(),
    loadSafety(admin.id, admin.email),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon="server"
        title="System health"
        description="Live status of the AWS + Vercel services powering CareCircle, the operational metrics behind them, and the safety signals being surfaced to families right now."
        badge={
          <Badge variant="success" className="gap-1.5">
            <Activity className="h-3 w-3" />
            Live
          </Badge>
        }
      />

      <AdminSystemLive initialHealth={initialHealth} initialSafety={initialSafety} />

      <DemoFootnote>
        Streamed live over Server-Sent Events · safety signals push the instant they&apos;re logged
        (Postgres NOTIFY) · AWS rows are real SDK health probes · audited cross-tenant path
      </DemoFootnote>
    </div>
  );
}

/** Load the safety feed, degrading to an empty (not crashed) feed when the cross-tenant DB is absent. */
async function loadSafety(id: string, email?: string | null): Promise<SafetyData> {
  if (!isPlatformDbConfigured()) {
    return { alerts: [], checkedAt: new Date().toISOString() };
  }
  const alerts = await getSafetyAlerts({ id, email });
  return { alerts, checkedAt: new Date().toISOString() };
}
