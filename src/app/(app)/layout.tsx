import type { ReactNode } from "react";
import { requireSession } from "@/db/dal";

/**
 * Authentication gate for the entire authenticated area of the app.
 *
 * Every route placed under this `(app)` route group is protected by DEFAULT — there is no
 * per-page opt-in to forget. `requireSession()` runs on the server for each request and
 * redirects unauthenticated visitors to /sign-in. This is the authoritative check; `proxy.ts`
 * is only an optimistic edge redirect, and Aurora Row-Level Security is the final guarantee
 * that a signed-in user can only read/write rows in their own care circles.
 *
 * 👉 To add a new authenticated screen, create it under src/app/(app)/… and it is secured
 *    automatically. Public pages (marketing, auth, invite) live OUTSIDE this group.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return <>{children}</>;
}
