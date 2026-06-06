import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/db/dal";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

/**
 * Platform super-admin console layout.
 *
 * Defense-in-depth: this sits inside the `(app)` group (which already runs `requireSession()`),
 * and adds `requirePlatformAdmin()` — a valid session is not enough; the email must be on the
 * PLATFORM_ADMIN_EMAILS allowlist. Non-admins are redirected to their own dashboard.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-background">
      <AdminTopBar adminEmail={admin.email} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
}
