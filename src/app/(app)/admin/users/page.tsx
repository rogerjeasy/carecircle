import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PlatformUser } from "@/lib/admin/dashboard-data";
import { requirePlatformAdmin } from "@/db/dal";
import { isPlatformDbConfigured } from "@/db/admin-db";
import { getPlatformUsers } from "@/db/admin-queries";
import { AdminPageHeader, MiniStat, DemoFootnote } from "@/components/admin/sections";
import { UsersDirectory } from "@/components/admin/users-directory";

export const metadata = { title: "Users · Kintwadi Admin" };

const DAY_MS = 24 * 60 * 60 * 1000;

function countActiveLast30d(users: PlatformUser[]): number {
  const cutoff = Date.now() - 30 * DAY_MS;
  return users.filter((u) => u.lastSignInAt !== null && u.lastSignInAt > cutoff).length;
}

export default async function AdminUsersPage() {
  const admin = await requirePlatformAdmin();

  // Real accounts only — when the cross-tenant connection is unavailable the directory below
  // renders a proper empty state instead of fabricated rows.
  let users: PlatformUser[] = [];
  if (isPlatformDbConfigured()) {
    try {
      users = await getPlatformUsers({ id: admin.id, email: admin.email });
    } catch {
      users = [];
    }
  }

  const guests = users.filter((u) => u.kind === "guest").length;
  const active30d = countActiveLast30d(users);
  const suspended = users.filter((u) =>
    u.memberships.some((m) => m.status === "suspended"),
  ).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon="users"
        title="Users"
        description="Every account on the platform — normal members and anonymous demo guests. Review their info, fix details, adjust circle roles, suspend, or delete accounts. Each action is audited and the circle's own ledger records it."
        badge={
          <Badge variant="outline" className="gap-1">
            <Info className="h-3 w-3" />
            {users.length > 0 ? "Live data" : "No data"}
          </Badge>
        }
      />

      {/* Summary tiles: 1 → 2 → 4 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon="users" label="Total accounts" value={users.length} sub="members, guests & staff" />
        <MiniStat icon="login" label="Active last 30 days" value={active30d} sub="signed in recently" tone="success" />
        <MiniStat icon="userCog" label="Anonymous guests" value={guests} sub="from “Run demo” sessions" />
        <MiniStat icon="alert" label="With suspended access" value={suspended} sub="suspended in ≥ 1 circle" tone="warning" />
      </section>

      <UsersDirectory users={users} />

      <DemoFootnote>
        Live account data, read through the audited cross-tenant path — every view and every change
        is itself recorded. Staff accounts stay locked to the env allowlist.
      </DemoFootnote>
    </div>
  );
}
