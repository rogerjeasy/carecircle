import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Kpi, Trend, AuditEvent, Alert } from "@/lib/admin/dashboard-data";
import { requirePlatformAdmin } from "@/db/dal";
import { isPlatformDbConfigured } from "@/db/admin-db";
import {
  getPlatformCounts,
  getActivitySeries,
  getRecentAuditEvents,
  getSafetyAlerts,
  pingDb,
  type PlatformCounts,
  type ActivityPoint,
} from "@/db/admin-queries";
import {
  AdminPageHeader,
  RangeToggle,
  StatCard,
  ActivityChart,
  SignInsChart,
  AuditLog,
  SafetyAlerts,
  EmptyState,
  DemoFootnote,
} from "@/components/admin/sections";

export const metadata = { title: "Overview · CareCircle Admin" };

// Live values carry a neutral pill — we show the real number, not a fabricated delta.
const LIVE: Trend = { value: "live", direction: "flat", good: true };

export default async function AdminOverviewPage() {
  const admin = await requirePlatformAdmin();
  const configured = isPlatformDbConfigured();

  let counts: PlatformCounts | null = null;
  let activity: ActivityPoint[] = [];
  let recent: AuditEvent[] = [];
  let safety: Alert[] = [];
  let dbLatencyMs: number | null = null;

  if (configured) {
    const actor = { id: admin.id, email: admin.email };
    try {
      const [c, a, r, s, probe] = await Promise.all([
        getPlatformCounts(actor),
        getActivitySeries(actor),
        getRecentAuditEvents(actor, 5),
        getSafetyAlerts(actor),
        pingDb(),
      ]);
      counts = c;
      activity = a;
      recent = r;
      safety = s;
      dbLatencyMs = probe.ok ? probe.latencyMs : null;
    } catch {
      counts = null;
    }
  }

  // Console can't read tenant data without the privileged connection — say so plainly.
  if (!configured || !counts) {
    return (
      <div className="space-y-8">
        <AdminPageHeader
          title="Platform overview"
          description="Everything happening across CareCircle — usage, security, and system health in one place."
        />
        <EmptyState
          title="Platform data unavailable"
          description="The privileged cross-tenant connection (MIGRATION_DATABASE_URL) isn't configured or couldn't be reached, so live platform metrics can't be loaded right now."
        />
      </div>
    );
  }

  const primary: Kpi[] = [
    { key: "circles", label: "Active care circles", value: counts.circles, trend: LIVE, hint: "tenants on the platform" },
    { key: "users", label: "Active users (30d)", value: counts.users30d, trend: LIVE, hint: "distinct actors in the audit log" },
    { key: "meds", label: "Medications logged (24h)", value: counts.meds24h, trend: LIVE, hint: "give-a-med timeline events" },
    { key: "audit", label: "Audit events (24h)", value: counts.audit24h, trend: LIVE, hint: "append-only ledger writes" },
  ];

  const secondary: Kpi[] = [
    { key: "incidents", label: "Open incidents (24h)", value: counts.incidents, trend: LIVE, hint: "falls / ER / urgent" },
    { key: "members", label: "Total members", value: counts.members, trend: LIVE, hint: "active memberships across circles" },
    { key: "invites", label: "Pending invites", value: counts.pendingInvites, trend: LIVE, hint: "awaiting acceptance" },
    {
      key: "latency",
      label: "Aurora latency",
      value: dbLatencyMs ?? 0,
      format: "ms",
      trend: LIVE,
      hint: dbLatencyMs === null ? "probe unavailable" : "measured select 1 round-trip",
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Platform overview"
        description="Everything happening across CareCircle — usage, security, and system health in one place."
        badge={
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            Live data
          </Badge>
        }
        actions={<RangeToggle />}
      />

      {/* Primary KPIs: 1 → 2 → 4 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primary.map((k, i) => (
          <StatCard key={k.key} kpi={k} delay={i * 60} />
        ))}
      </section>

      {/* Charts: stack → 2-col on laptop+ (both real, from the audit activity series) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityChart data={activity} />
        <SignInsChart data={activity} />
      </section>

      {/* Secondary stats: 2 → 4 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {secondary.map((k, i) => (
          <StatCard key={k.key} kpi={k} delay={i * 60} />
        ))}
      </section>

      {/* Recent audit + safety, both real with empty states */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AuditLog limit={5} footerHref="/admin/audit" events={recent} />
        </div>
        <SafetyAlerts alerts={safety} />
      </section>

      <DemoFootnote>
        Live cross-tenant data, read through a privileged, audited path — every view is itself recorded.
        For full system-service health (AWS + Vercel probes), see the System page.
      </DemoFootnote>
    </div>
  );
}
