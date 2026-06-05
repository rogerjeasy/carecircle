/**
 * Data Access Layer — the single, secure entry point for tenant data.
 * Pattern recommended by Next.js: do authorization "as close as possible to the data source".
 * Here that means: resolve the signed-in user, then run inside an RLS-scoped transaction.
 */
import 'server-only';
import { auth } from '@/auth';
import { withUserContext, type Tx } from './rls';

/** The authenticated user's id, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Run a tenant query as the current user, with RLS enforced. Throws if not signed in. */
export async function withAuthedDb<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Not authenticated');
  return withUserContext(userId, fn);
}
