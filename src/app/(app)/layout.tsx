import type { ReactNode } from "react";
import { requireSession } from "@/db/dal";
import { getCurrentUser } from "@/lib/user/current-user";
import { getActiveOutages } from "@/lib/status/outages";
import { AppShellProvider } from "@/components/app-shell/app-shell-context";

/**
 * Authentication gate for the entire authenticated area of the app.
 *
 * Every route placed under this `(app)` route group is protected by DEFAULT — there is no
 * per-page opt-in to forget. `requireSession()` runs on the server for each request and
 * redirects unauthenticated visitors to /sign-in. This is the authoritative check; `proxy.ts`
 * is only an optimistic edge redirect, and Aurora Row-Level Security is the final guarantee
 * that a signed-in user can only read/write rows in their own care circles.
 *
 * The layout also resolves the signed-in user's profile + membership role server-side and seeds
 * the app-shell context with it, so the very first paint renders the correct role lens — no
 * coordinator-default flash for recipients/read-only members.
 *
 * 👉 To add a new authenticated screen, create it under src/app/(app)/… and it is secured
 *    automatically. Public pages (marketing, auth, invite) live OUTSIDE this group.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession();
  // Outages feed the shell's service-status banner; cached 30s + fail-quiet, so it never slows
  // or breaks a page (see lib/status/outages.ts).
  const [user, outages] = await Promise.all([getCurrentUser(), getActiveOutages()]);
  return (
    <AppShellProvider initialUser={user} initialOutages={outages}>
      {children}
    </AppShellProvider>
  );
}
