/**
 * Data Access Layer — the single, secure entry point for tenant data.
 * Pattern recommended by Next.js: do authorization "as close as possible to the data source".
 * Here that means: resolve the signed-in user, then run inside an RLS-scoped transaction.
 */
import 'server-only';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isPlatformAdminEmail } from '@/lib/admin/access';
import { withUserContext, type Tx } from './rls';

/** The authenticated user's id, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Authoritative server-side auth gate. Returns the signed-in user or redirects to /sign-in.
 * Use this in every protected layout / server component / page — it validates the session on
 * the server for the current request (not just the optimistic cookie check in proxy.ts).
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  return session.user;
}

/**
 * Gate for the platform super-admin console. Requires a valid session AND an allowlisted
 * platform-admin email; non-admins are bounced to their own dashboard. Layered on top of
 * `requireSession()` (defense-in-depth) — never the only check.
 */
export async function requirePlatformAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  if (!isPlatformAdminEmail(session.user.email)) {
    redirect('/dashboard');
  }
  return session.user;
}

/** Run a tenant query as the current user, with RLS enforced. Throws if not signed in. */
export async function withAuthedDb<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Not authenticated');
  return withUserContext(userId, fn);
}
