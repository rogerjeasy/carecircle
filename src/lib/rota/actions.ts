'use server';

/**
 * Care Rota server actions — add and remove shifts.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Re-checks `requireSession()` and re-authorizes against the user's REAL membership role
 *    (owner/family_admin/family). RLS (drizzle/0023) is the final backstop.
 *  - Writes through `withAuthedDb()` (RLS-scoped) and audited.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { careShift, membership } from '@/db/schema';
import { canManageRota } from './access';
import { getRotaData } from './queries';
import { onCallNow, to12h, firstName } from '@/components/rota/utils';
import type { Shift, ShiftType } from '@/components/rota/types';

export type ActionError = { ok: false; error: string };
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | ActionError;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';

interface ActorContext {
  userId: string;
  circleId: string;
  membershipId: string;
  role: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ id: membership.id, role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.circleId, circleId),
          eq(membership.userId, user.id),
          eq(membership.status, 'active'),
          isNull(membership.deletedAt),
        ),
      )
      .limit(1),
  );
  if (!m) return null;
  return { userId: user.id, circleId, membershipId: m.id, role: m.role };
}

const shiftSchema = z.object({
  memberId: z.string().uuid(),
  dayIndex: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{1,2}:\d{2}$/),
  end: z.string().regex(/^\d{1,2}:\d{2}$/),
  type: z.enum(['in-person', 'on-call']),
});

/** Add a shift to the rota. Returns the created Shift for instant reconciliation. */
export async function createShift(formData: FormData): Promise<ActionResult<Shift>> {
  const ctx = await getActorContext();
  serverLog('rota', 'createShift', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageRota(ctx.role)) {
    serverLog('rota', 'createShift', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  let raw: unknown = {};
  try {
    raw = JSON.parse(formData.get('payload')?.toString() ?? '{}');
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed = shiftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Please check the shift details.' };
  const p = parsed.data;

  try {
    const row = await withAuthedDb(async (tx) => {
      // The assignee must be a member of this circle (RLS also enforces tenancy).
      const [m] = await tx
        .select({ id: membership.id })
        .from(membership)
        .where(and(eq(membership.id, p.memberId), eq(membership.circleId, ctx.circleId), isNull(membership.deletedAt)))
        .limit(1);
      if (!m) throw new Error('not_found_or_forbidden');

      const [created] = await tx
        .insert(careShift)
        .values({
          circleId: ctx.circleId,
          assignedToMembershipId: p.memberId,
          dayIndex: p.dayIndex,
          startTime: p.start,
          endTime: p.end,
          shiftType: p.type,
          createdByMembershipId: ctx.membershipId,
        })
        .returning();
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'care_shift', entityId: created.id, summary: `Added a ${p.type} shift` },
        tx,
      );
      return created;
    });

    serverLog('rota', 'createShift', 'success', { actor: ctx.userId, id: row.id });
    return {
      ok: true,
      data: {
        id: row.id,
        memberId: p.memberId,
        dayIndex: p.dayIndex,
        start: p.start,
        end: p.end,
        type: p.type as ShiftType,
      },
    };
  } catch (err) {
    serverLog('rota', 'createShift', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Remove a shift from the rota (soft-delete). */
export async function deleteShift(shiftId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('rota', 'deleteShift', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageRota(ctx.role)) return { ok: false, error: FORBIDDEN };
  const id = z.string().uuid().safeParse(shiftId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(careShift)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(careShift.id, id.data), eq(careShift.circleId, ctx.circleId), isNull(careShift.deletedAt)))
        .returning({ id: careShift.id });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'care_shift', entityId: id.data, summary: 'Removed a shift' },
        tx,
      );
    });
    serverLog('rota', 'deleteShift', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('rota', 'deleteShift', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Who is on call RIGHT NOW in the active circle — the single source of truth for the top-bar
 * chip, computed from the same rota rows + `onCallNow()` helper the dashboard card and the
 * rota screen use, so the three can never disagree. Read-only (RLS-scoped via getRotaData).
 */
export async function getOnCallNowAction(): Promise<{ name: string; until: string } | null> {
  const rota = await getRotaData();
  if (!rota) return null;
  const hit = onCallNow(rota.shifts, new Date(), rota.members);
  return hit ? { name: firstName(hit.member.name), until: to12h(hit.shift.end) } : null;
}
