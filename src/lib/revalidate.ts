import 'server-only';
import { revalidatePath } from 'next/cache';
import { serverLog } from '@/lib/log';

/**
 * Refresh the two cross-cutting, server-rendered views that aggregate *every* feature's writes:
 *
 *  - **`/timeline`** — the activity-stream spine; every contributing action (med, vital, note,
 *    task, appointment, incident…) emits a `timeline_event`, so any of them can leave it stale.
 *  - **`/dashboard`** — the glanceable home, built from cross-feature aggregates (meds due today,
 *    next appointment, open tasks, latest vital).
 *
 * Each feature screen already reconciles its OWN state optimistically from the action's return DTO;
 * this is the belt-and-suspenders for the *other* surfaces the user might navigate to next. Cheap
 * and idempotent — `revalidatePath` only invalidates the client Router Cache entry, the work happens
 * lazily on the next visit. Call it from a server action after a mutation commits successfully.
 *
 * Best-effort by contract (AGENTS.md): this is a cache hint, so a failure must NEVER throw back into
 * the action and turn a committed mutation into a user-facing error. The next visit refetches the
 * dynamic page regardless.
 */
export function revalidateCareViews(): void {
  try {
    revalidatePath('/timeline');
    revalidatePath('/dashboard');
  } catch (err) {
    serverLog('revalidate', 'careViews', 'failure', { reason: (err as Error)?.name ?? 'error' });
  }
}
