'use server';

/**
 * Invitation acceptance + decline — the invitee's side of the invite lifecycle.
 *
 * Security (see AGENTS.md):
 *  - Accepting re-checks auth itself via `requireSession()`.
 *  - The join is bootstrapped by `accept_invitation()` (drizzle/0006): the invitee isn't a member
 *    yet, so the RLS-bound app role can't insert its own `membership`. The SECURITY DEFINER function
 *    validates the token and creates the membership for the CURRENT user only — then everything
 *    after (timeline, audit) flows through normal RLS because the user is now a member.
 *  - Declining deliberately does NOT require a session: the decliner usually has no account (that
 *    is the point of declining), so `decline_invitation()` (drizzle/0045) is keyed off the token
 *    capability alone and writes its own audit row (a non-member can't pass the audit RLS policy).
 *  - 🔒 Tokens are hashed at rest (drizzle/0045): the link carries the raw secret, the DB stores
 *    its SHA-256, so both actions hash before lookup and the raw token never reaches the database.
 *  - The state change is audited inside the same transaction.
 */
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { requireSession, withAuthedDb } from '@/db/dal';
import { timelineEvent, careCircle, careRecipientProfile } from '@/db/schema';
import { recordAuditEvent } from '@/db/audit';
import { hashToken } from '@/lib/auth/tokens';
import { sendJoinedCircleEmail } from '@/lib/email';
import { serverLog } from '@/lib/log';
import { getAppOrigin } from '@/lib/url';

export type AcceptResult =
  | { ok: true; circleId: string; alreadyMember: boolean }
  | { ok: false; error: string };

const tokenSchema = z.string().trim().min(1).max(512);


type AcceptRow = {
  circle_id: string;
  membership_id: string;
  role: string;
  already_member: boolean;
};

export async function acceptInvitation(token: string): Promise<AcceptResult> {
  const user = await requireSession();

  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return { ok: false, error: 'This invitation link is invalid.' };
  }

  try {
    const result = await withAuthedDb(async (tx) => {
      const rows = (await tx.execute(
        sql`select circle_id, membership_id, role, already_member from accept_invitation(${hashToken(parsed.data)})`,
      )) as unknown as AcceptRow[];
      const r = rows[0];
      if (!r?.circle_id) throw new Error('accept returned no circle');

      let circleName = '';
      let recipientName = '';
      // New members get a friendly "joined" beat on the timeline + a welcome email (skip if they
      // were already in the circle). The user IS now a member, so these reads pass RLS.
      if (!r.already_member) {
        await tx.insert(timelineEvent).values({
          circleId: r.circle_id,
          actorMembershipId: r.membership_id,
          eventType: 'system',
          summary: `${user.name?.trim() || 'A new member'} joined the care circle.`,
          visibility: 'all',
        });

        const [circle] = await tx
          .select({ name: careCircle.name })
          .from(careCircle)
          .where(eq(careCircle.id, r.circle_id))
          .limit(1);
        const [profile] = await tx
          .select({ fullName: careRecipientProfile.fullName })
          .from(careRecipientProfile)
          .where(eq(careRecipientProfile.circleId, r.circle_id))
          .limit(1);
        circleName = circle?.name ?? 'your care circle';
        recipientName = profile?.fullName ?? circleName;
      }

      await recordAuditEvent(
        user.id,
        {
          circleId: r.circle_id,
          action: 'invite',
          entityType: 'membership',
          entityId: r.membership_id,
          summary: r.already_member ? 'Re-confirmed circle membership' : 'Accepted invitation',
        },
        tx,
      );

      return {
        circleId: r.circle_id,
        alreadyMember: r.already_member,
        role: r.role,
        circleName,
        recipientName,
      };
    });

    // Welcome the new member — best-effort, after the join is committed. First-time joins only.
    if (!result.alreadyMember && user.email) {
      try {
        const origin = await getAppOrigin();
        await sendJoinedCircleEmail({
          to: user.email,
          recipientName: result.recipientName,
          circleName: result.circleName,
          role: result.role,
          dashboardUrl: `${origin}/dashboard`,
        });
      } catch (err) {
        console.error('[invitations] joined-circle email failed:', (err as Error)?.name ?? 'error');
      }
    }

    serverLog('invitations', 'acceptInvitation', 'success', {
      actor: user.id,
      circleId: result.circleId,
      alreadyMember: result.alreadyMember,
    });
    return { ok: true, circleId: result.circleId, alreadyMember: result.alreadyMember };
  } catch (err) {
    const message = (err as Error)?.message ?? '';
    const invalid = /not valid|not found/.test(message);
    serverLog('invitations', 'acceptInvitation', 'failure', {
      actor: user.id,
      reason: invalid ? 'invalid_or_expired' : (err as Error)?.name ?? 'error',
    });
    if (invalid) {
      return { ok: false, error: 'This invitation is no longer valid. Ask the coordinator for a new one.' };
    }
    return { ok: false, error: "We couldn't accept this invitation. Please try again." };
  }
}

export type DeclineResult = { ok: true } | { ok: false; error: string };

type DeclineRow = { circle_id: string; invitation_id: string };

/**
 * Decline an invitation — single-use: a declined link can never be accepted afterwards.
 *
 * No session is required (the decliner usually has no account), so possession of the token IS the
 * authorization — the same capability model as the public invite page. When the visitor *is*
 * signed in we run inside their RLS context anyway, purely so `decline_invitation()` can attribute
 * the audit row to them via `current_app_user_id()`; anonymous declines are audited with a NULL actor.
 */
export async function declineInvitation(token: string): Promise<DeclineResult> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return { ok: false, error: 'This invitation link is invalid.' };
  }
  const session = await auth(); // optional — for audit attribution only, never a gate
  const declineSql = sql`select circle_id, invitation_id from decline_invitation(${hashToken(parsed.data)})`;

  try {
    const rows = (session?.user?.id
      ? await withAuthedDb((tx) => tx.execute(declineSql))
      : await db.execute(declineSql)) as unknown as DeclineRow[];
    const r = rows[0];
    if (!r?.circle_id) throw new Error('decline returned no circle');

    serverLog('invitations', 'declineInvitation', 'success', {
      actor: session?.user?.id ?? 'anonymous',
      circleId: r.circle_id,
      invitationId: r.invitation_id,
    });
    return { ok: true };
  } catch (err) {
    const message = (err as Error)?.message ?? '';
    const invalid = /not valid|not found/.test(message);
    serverLog('invitations', 'declineInvitation', 'failure', {
      actor: session?.user?.id ?? 'anonymous',
      reason: invalid ? 'invalid_or_expired' : (err as Error)?.name ?? 'error',
    });
    if (invalid) {
      return { ok: false, error: 'This invitation is no longer valid — it may have expired or already been used.' };
    }
    return { ok: false, error: "We couldn't decline this invitation. Please try again." };
  }
}
