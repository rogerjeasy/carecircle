'use server';

/**
 * Emergency Card server actions — set the advance directive, and create/revoke the public
 * emergency share link (the tokenized `/e/<token>` capability EMS scans from the printed QR).
 *
 * Security (see AGENTS.md): every action re-checks session + the user's REAL membership role
 * (owner/family_admin only — matching the care_recipient_profile `crp_mutate` and 0041
 * `emergency_card_share_manage` RLS policies, which are the backstop). Audited.
 */
import { z } from 'zod';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { randomToken } from '@/lib/auth/tokens';
import { getAppOrigin } from '@/lib/url';
import { careRecipientProfile, emergencyCardShare, membership } from '@/db/schema';

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

// ---------------------------------------------------------------------------
// Public share link (the QR EMS scans)
// ---------------------------------------------------------------------------

export type ShareActionResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; error: string };

/** How long a new share link lives. Short by design — the QR is for an active emergency window. */
const SHARE_TTL_HOURS = 72;

/** Resolve the actor's role in the active circle, or null. Shared by the two share actions. */
async function getManagerContext(userId: string): Promise<{ circleId: string; membershipId: string; role: string } | null> {
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ id: membership.id, role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.circleId, circleId),
          eq(membership.userId, userId),
          eq(membership.status, 'active'),
          isNull(membership.deletedAt),
        ),
      )
      .limit(1),
  );
  if (!m) return null;
  return { circleId, membershipId: m.id, role: m.role };
}

/**
 * Create (or rotate) the circle's public emergency-card link. Coordinator-only. Any previous live
 * link is revoked in the SAME transaction, so exactly one capability is valid at a time, and both
 * the revocation and the creation land in the append-only audit log.
 */
export async function createEmergencyShare(): Promise<ShareActionResult> {
  const user = await requireSession();
  serverLog('emergency', 'createShare', 'start', { actor: user.id });

  try {
    const ctx = await getManagerContext(user.id);
    if (!ctx || !MANAGE_ROLES.includes(ctx.role)) {
      serverLog('emergency', 'createShare', 'failure', { actor: user.id, reason: 'forbidden' });
      return { ok: false, error: 'You do not have permission to do that.' };
    }

    const token = randomToken();
    const expiresAt = new Date(Date.now() + SHARE_TTL_HOURS * 3_600_000);

    await withAuthedDb(async (tx) => {
      const revoked = await tx
        .update(emergencyCardShare)
        .set({ revokedAt: new Date() })
        .where(
          and(eq(emergencyCardShare.circleId, ctx.circleId), isNull(emergencyCardShare.revokedAt)),
        )
        .returning({ id: emergencyCardShare.id });

      const [row] = await tx
        .insert(emergencyCardShare)
        .values({
          circleId: ctx.circleId,
          token,
          createdByMembershipId: ctx.membershipId,
          expiresAt,
        })
        .returning({ id: emergencyCardShare.id });

      await recordAuditEvent(
        user.id,
        {
          circleId: ctx.circleId,
          action: 'create',
          entityType: 'emergency_card_share',
          entityId: row.id,
          summary:
            revoked.length > 0
              ? 'Rotated the public emergency-card link (previous link revoked)'
              : 'Created a public emergency-card link',
        },
        tx,
      );
    });

    const origin = await getAppOrigin();
    serverLog('emergency', 'createShare', 'success', { actor: user.id });
    return { ok: true, url: `${origin}/e/${token}`, expiresAt: expiresAt.toISOString() };
  } catch (err) {
    serverLog('emergency', 'createShare', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

/** Revoke the circle's live emergency-card link(s). Coordinator-only. Audited. */
export async function revokeEmergencyShare(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireSession();
  serverLog('emergency', 'revokeShare', 'start', { actor: user.id });

  try {
    const ctx = await getManagerContext(user.id);
    if (!ctx || !MANAGE_ROLES.includes(ctx.role)) {
      serverLog('emergency', 'revokeShare', 'failure', { actor: user.id, reason: 'forbidden' });
      return { ok: false, error: 'You do not have permission to do that.' };
    }

    await withAuthedDb(async (tx) => {
      const revoked = await tx
        .update(emergencyCardShare)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(emergencyCardShare.circleId, ctx.circleId),
            isNull(emergencyCardShare.revokedAt),
            gt(emergencyCardShare.expiresAt, new Date()),
          ),
        )
        .returning({ id: emergencyCardShare.id });

      for (const r of revoked) {
        await recordAuditEvent(
          user.id,
          {
            circleId: ctx.circleId,
            action: 'update',
            entityType: 'emergency_card_share',
            entityId: r.id,
            summary: 'Revoked the public emergency-card link',
          },
          tx,
        );
      }
    });

    serverLog('emergency', 'revokeShare', 'success', { actor: user.id });
    return { ok: true };
  } catch (err) {
    serverLog('emergency', 'revokeShare', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
