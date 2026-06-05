/**
 * RLS session-context bridge.
 *
 * Every tenant query runs inside a transaction that sets `app.current_user_id` (LOCAL to
 * the transaction). The Postgres RLS policies read this value via `current_app_user_id()`
 * to decide which rows the current user may see/modify. This is what makes "roles" a real
 * database guarantee rather than a UI illusion.
 */
import { sql } from 'drizzle-orm';
import { db } from './index';

// The transaction handle type Drizzle passes to the callback.
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Run `fn` with RLS scoped to `userId`. All queries must use the provided `tx`.
 */
export async function withUserContext<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    // `true` => set LOCAL: the value is scoped to this transaction only.
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    return fn(tx);
  });
}
