import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tenant } from "@/lib/admin/dashboard-data";
import { requirePlatformAdmin } from "@/db/dal";
import { isPlatformDbConfigured } from "@/db/admin-db";
import { getTenants } from "@/db/admin-queries";
import { AdminPageHeader, MiniStat, TenantsTable, TenantCards, DemoFootnote } from "@/components/admin/sections";

export const metadata = { title: "Tenants · Kintwadi Admin" };

export default async function AdminTenantsPage() {
  const admin = await requirePlatformAdmin();

  // Real tenant rows only. If unavailable, the table/cards below render a proper empty state.
  let tenants: Tenant[] = [];
  if (isPlatformDbConfigured()) {
    try {
      tenants = await getTenants({ id: admin.id, email: admin.email });
    } catch {
      tenants = [];
    }
  }
  const live = tenants.length > 0;

  const totalMembers = tenants.reduce((sum, t) => sum + t.members, 0);
  const plusCount = tenants.filter((t) => t.plan === "Plus").length;
  const attentionCount = tenants.filter((t) => t.status === "attention").length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon="building"
        title="Care circles"
        description="Every tenant on the platform — the care circles families run for an aging parent. Each is fully isolated by row-level security; this cross-tenant view is staff-only and audited."
        badge={
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            {live ? "Live data" : "Demo data"}
          </Badge>
        }
      />

      {/* Summary tiles: 1 → 2 → 4 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon="building" label="Active care circles" value={tenants.length} sub="tenants on the platform" />
        <MiniStat icon="users" label="Total members" value={totalMembers} sub="caregivers, family & staff" tone="success" />
        <MiniStat icon="badge" label="On Plus plan" value={plusCount} sub={`of ${tenants.length} circles`} />
        <MiniStat icon="alert" label="Needs attention" value={attentionCount} sub="flagged for follow-up" tone="warning" />
      </section>

      {/* Card grid (3 → 2 → 1) — a real tablet layout */}
      <TenantCards tenants={tenants} />

      {/* Full table for laptop+ workflows */}
      <TenantsTable tenants={tenants} />

      <DemoFootnote>
        Live tenant data, read through the audited cross-tenant path — every view is itself recorded.
      </DemoFootnote>
    </div>
  );
}
