import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, MiniStat, AuditLog, DemoFootnote } from "@/components/admin/sections";
import { requirePlatformAdmin } from "@/db/dal";
import { getRecentAuditEvents, getAuditStats, type AuditStats } from "@/db/admin-queries";
import { isPlatformDbConfigured } from "@/db/admin-db";
import type { AuditEvent } from "@/lib/admin/dashboard-data";

export const metadata = { title: "Audit & logs · CareCircle Admin" };

const num = (n: number) => n.toLocaleString("en-US");

export default async function AdminAuditPage() {
  // Defense-in-depth: the /admin layout already gates, but re-check here (and we need the actor).
  const admin = await requirePlatformAdmin();

  // Pull the real append-only ledger + 24h aggregates across all circles. No demo fallback —
  // empty reads render real zeros and a proper empty state in the ledger below.
  let events: AuditEvent[] = [];
  let stats: AuditStats | null = null;
  if (isPlatformDbConfigured()) {
    const actor = { id: admin.id, email: admin.email };
    try {
      [events, stats] = await Promise.all([
        getRecentAuditEvents(actor, 100),
        getAuditStats(actor),
      ]);
    } catch {
      events = [];
      stats = null;
    }
  }
  const dash = "—";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon="shield"
        title="Audit & logs"
        description="The append-only ledger of every sensitive action across all care circles — sign-ins, medication changes, document access, invites, and role changes. Immutable by design, filterable, and exportable for compliance."
        badge={
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            Live ledger
          </Badge>
        }
      />

      {/* Summary tiles: 1 → 2 → 4 — real 24h counts from the append-only ledger. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon="shield" label="Audit events (24h)" value={stats ? num(stats.total) : dash} sub="append-only ledger writes" />
        <MiniStat icon="login" label="Sign-ins (24h)" value={stats ? num(stats.logins) : dash} sub="across all providers" tone="success" />
        <MiniStat icon="export" label="Document exports (24h)" value={stats ? num(stats.exports) : dash} sub="emergency cards & records" tone="warning" />
        <MiniStat icon="userCog" label="Role & invite changes (24h)" value={stats ? num(stats.roleAndInvite) : dash} sub="membership updates" />
      </section>

      {/* Full filterable ledger — real audit_log rows, or a proper empty state when there are none. */}
      <AuditLog events={events} />

      <DemoFootnote>
        The ledger is read through a privileged, audited path — every cross-tenant view is itself recorded.
      </DemoFootnote>
    </div>
  );
}
