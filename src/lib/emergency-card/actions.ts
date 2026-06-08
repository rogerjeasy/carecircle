'use server';

/**
 * Emergency Card server action — set the care recipient's advance directive text.
 *
 * Security (see AGENTS.md): re-checks session + the user's REAL membership role (owner/family_admin
 * only, matching the care_recipient_profile RLS `crp_mutate` policy). Audited.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { careRecipientProfile, membership } from '@/db/schema';

export type ActionResult = { ok: true; value: string | null } | { ok: false; error: string };

const MANAGE_ROLES = ['owner', 'family_admin'];

/** Update (or clear) the recipient's advance directive shown on the emergency card. */
export async function updateAdvanceDirective(text: string): Promise<ActionResult> {
  const user = await requireSession();
  serverLog('emergency', 'updateAdvanceDirective', 'start', { actor: user.id });
  const circleId = await getActiveCircleId();
  if (!circleId) return { ok: false, error: 'No active care circle.' };

  const clean = z.string().trim().max(200).safeParse(text);
  if (!clean.success) return { ok: false, error: 'Keep it under 200 characters.' };
  const value = clean.data || null;

  try {
    const role = await withAuthedDb(async (tx) => {
      const [m] = await tx
        .select({ role: membership.role })
        .from(membership)
        .where(
          and(
            eq(membership.circleId, circleId),
            eq(membership.userId, user.id),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
          ),
        )
        .limit(1);
      if (!m || !MANAGE_ROLES.includes(m.role)) throw new Error('forbidden');

      const [row] = await tx
        .update(careRecipientProfile)
        .set({ advanceDirective: value, updatedAt: new Date() })
        .where(eq(careRecipientProfile.circleId, circleId))
        .returning({ id: careRecipientProfile.id });
      if (!row) throw new Error('not_found');

      await recordAuditEvent(
        user.id,
        { circleId, action: 'update', entityType: 'care_recipient_profile', entityId: row.id, summary: 'Updated advance directive' },
        tx,
      );
      return m.role;
    });

    serverLog('emergency', 'updateAdvanceDirective', 'success', { actor: user.id, role });
    return { ok: true, value };
  } catch (err) {
    const reason = (err as Error)?.message === 'forbidden' ? 'forbidden' : (err as Error)?.name ?? 'error';
    serverLog('emergency', 'updateAdvanceDirective', 'failure', { actor: user.id, reason });
    return { ok: false, error: reason === 'forbidden' ? 'You do not have permission to do that.' : 'Something went wrong.' };
  }
}
