'use server';

/**
 * People server actions — invite, change role, suspend/reactivate, remove, and manage invitations.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Each action re-checks `requireSession()` and re-authorizes against the user's REAL membership
 *    role (owner/family_admin only). The membership/invitation RLS policies are the final backstop.
 *  - All writes run through `withAuthedDb()` (RLS-scoped) and are audited.
 *  - Invitee emails are PII, so invites ride in FormData (Next's dev logger never prints FormData);
 *    logs use `maskEmail()` / counts only.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog, maskEmail } from '@/lib/log';
import { membership, invitation, careRecipientProfile, roleEnum } from '@/db/schema';
import { randomToken, hashToken } from '@/lib/auth/tokens';
import { sendInvitationEmail } from '@/lib/email';
import { getAppOrigin } from '@/lib/url';
import { canManagePeople, circleRoleToDbRole } from './access';
import type { Invite } from '@/components/people/types';

export type ActionError = { ok: false; error: string };
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | ActionError;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CIRCLE_ROLES = [
  'coordinator',
  'family-admin',
  'family',
  'caregiver',
  'readonly',
  'care-recipient',
  'clinician',
] as const;

interface ActorContext {
  userId: string;
  name: string | null | undefined;
  email: string | null | undefined;
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
  return { userId: user.id, name: user.name, email: user.email, circleId, membershipId: m.id, role: m.role };
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  invites: z
    .array(z.object({ email: z.string().trim().email(), role: z.enum(CIRCLE_ROLES) }))
    .min(1)
    .max(20),
  note: z.string().max(500).optional().default(''),
});

export type InvitePeopleResult = { ok: true; data: Invite[] } | ActionError;

/** Create one invitation per row + email each link. Returns the created invites for the UI. */
export async function invitePeople(formData: FormData): Promise<InvitePeopleResult> {
  const ctx = await getActorContext();
  serverLog('people', 'invitePeople', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManagePeople(ctx.role)) {
    serverLog('people', 'invitePeople', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  let raw: unknown = {};
  try {
    raw = JSON.parse(formData.get('payload')?.toString() ?? '{}');
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Please check the email addresses.' };

  // De-dupe by email (keep first), mint a token each, and clamp "coordinator" (owner) → family_admin
  // (you don't invite an owner).
  const seen = new Set<string>();
  const issued = parsed.data.invites
    .map((i) => ({ email: i.email.toLowerCase(), circleRole: i.role }))
    .filter((i) => i.email && !seen.has(i.email) && seen.add(i.email))
    .map((i) => {
      const dbRole = circleRoleToDbRole(i.circleRole);
      return { ...i, dbRole: dbRole === 'owner' ? 'family_admin' : dbRole, token: randomToken() };
    });
  if (issued.length === 0) return { ok: false, error: 'Please add at least one email.' };
  const note = parsed.data.note.trim() || null;

  try {
    const result = await withAuthedDb(async (tx) => {
      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, ctx.circleId))
        .limit(1);

      // 🔒 Only the token's SHA-256 is stored (drizzle/0045) — the raw secret exists in the
      // emailed link alone, so a DB leak never yields working join links.
      const rows = await tx
        .insert(invitation)
        .values(
          issued.map((i) => ({
            circleId: ctx.circleId,
            email: i.email,
            role: i.dbRole as (typeof roleEnum.enumValues)[number],
            token: hashToken(i.token),
            invitedByMembershipId: ctx.membershipId,
            personalNote: note,
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          })),
        )
        .returning({ id: invitation.id, email: invitation.email, role: invitation.role, createdAt: invitation.createdAt });

      for (const i of issued) {
        await recordAuditEvent(
          ctx.userId,
          { circleId: ctx.circleId, action: 'invite', entityType: 'invitation', summary: `Invited a ${i.dbRole}` },
          tx,
        );
      }
      return { rows, recipientName: recipient?.fullName ?? 'your care circle' };
    });

    // Emails are best-effort, after commit — a delivery hiccup must not undo the invitations.
    const origin = await getAppOrigin();
    const inviterName = ctx.name?.trim() || 'A family member';
    await Promise.allSettled(
      issued.map((i) =>
        sendInvitationEmail({
          to: i.email,
          inviteUrl: `${origin}/invite/${i.token}`,
          inviterName,
          recipientName: result.recipientName,
          role: i.dbRole,
        }),
      ),
    );

    const data: Invite[] = result.rows.map((r) => {
      const circleRole = issued.find((i) => i.email === r.email)?.circleRole ?? 'family';
      return { id: r.id, email: r.email, role: circleRole, sentAt: r.createdAt };
    });
    serverLog('people', 'invitePeople', 'success', { actor: ctx.userId, count: data.length });
    return { ok: true, data };
  } catch (err) {
    serverLog('people', 'invitePeople', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Member mutations
// ---------------------------------------------------------------------------

async function memberMutation(
  action: string,
  membershipId: string,
  apply: (ctx: ActorContext, tx: Parameters<Parameters<typeof withAuthedDb>[0]>[0]) => Promise<void>,
): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('people', action, 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManagePeople(ctx.role)) return { ok: false, error: FORBIDDEN };
  if (!z.string().uuid().safeParse(membershipId).success) return { ok: false, error: GENERIC_ERROR };
  try {
    await withAuthedDb((tx) => apply(ctx, tx));
    serverLog('people', action, 'success', { actor: ctx.userId, id: membershipId });
    return { ok: true };
  } catch (err) {
    serverLog('people', action, 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Change a member's role. */
export async function changeMemberRole(membershipId: string, circleRole: string): Promise<ActionResult> {
  const role = z.enum(CIRCLE_ROLES).safeParse(circleRole);
  if (!role.success) return { ok: false, error: GENERIC_ERROR };
  const dbRole = circleRoleToDbRole(role.data) as (typeof roleEnum.enumValues)[number];
  return memberMutation('changeMemberRole', membershipId, async (ctx, tx) => {
    const [row] = await tx
      .update(membership)
      .set({ role: dbRole, updatedAt: new Date() })
      .where(and(eq(membership.id, membershipId), eq(membership.circleId, ctx.circleId), isNull(membership.deletedAt)))
      .returning({ id: membership.id });
    if (!row) throw new Error('not_found_or_forbidden');
    await recordAuditEvent(
      ctx.userId,
      { circleId: ctx.circleId, action: 'update', entityType: 'membership', entityId: membershipId, summary: `Changed a member's role to ${dbRole}` },
      tx,
    );
  });
}

/** Set or clear a member's contact phone (shown/callable on the emergency card). */
export async function updateMemberPhone(membershipId: string, phone: string): Promise<ActionResult> {
  const clean = z.string().trim().max(40).safeParse(phone);
  if (!clean.success) return { ok: false, error: 'Please enter a valid phone number.' };
  const value = clean.data || null;
  return memberMutation('updateMemberPhone', membershipId, async (ctx, tx) => {
    const [row] = await tx
      .update(membership)
      .set({ phone: value, updatedAt: new Date() })
      .where(and(eq(membership.id, membershipId), eq(membership.circleId, ctx.circleId), isNull(membership.deletedAt)))
      .returning({ id: membership.id });
    if (!row) throw new Error('not_found_or_forbidden');
    await recordAuditEvent(
      ctx.userId,
      { circleId: ctx.circleId, action: 'update', entityType: 'membership', entityId: membershipId, summary: 'Updated a member contact phone' },
      tx,
    );
  });
}

/** Suspend or reactivate a member. */
export async function setMemberStatus(membershipId: string, status: 'active' | 'suspended'): Promise<ActionResult> {
  const st = z.enum(['active', 'suspended']).safeParse(status);
  if (!st.success) return { ok: false, error: GENERIC_ERROR };
  return memberMutation('setMemberStatus', membershipId, async (ctx, tx) => {
    const [row] = await tx
      .update(membership)
      .set({ status: st.data, updatedAt: new Date() })
      .where(and(eq(membership.id, membershipId), eq(membership.circleId, ctx.circleId), isNull(membership.deletedAt)))
      .returning({ id: membership.id });
    if (!row) throw new Error('not_found_or_forbidden');
    await recordAuditEvent(
      ctx.userId,
      { circleId: ctx.circleId, action: 'update', entityType: 'membership', entityId: membershipId, summary: st.data === 'suspended' ? 'Suspended a member' : 'Reactivated a member' },
      tx,
    );
  });
}

/** Remove a member from the circle (soft-delete the membership). */
export async function removeMember(membershipId: string): Promise<ActionResult> {
  return memberMutation('removeMember', membershipId, async (ctx, tx) => {
    const [row] = await tx
      .update(membership)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(membership.id, membershipId), eq(membership.circleId, ctx.circleId), isNull(membership.deletedAt)))
      .returning({ id: membership.id });
    if (!row) throw new Error('not_found_or_forbidden');
    await recordAuditEvent(
      ctx.userId,
      { circleId: ctx.circleId, action: 'delete', entityType: 'membership', entityId: membershipId, summary: 'Removed a member from the circle' },
      tx,
    );
  });
}

// ---------------------------------------------------------------------------
// Invitation mutations
// ---------------------------------------------------------------------------

/** Revoke a pending invitation. */
export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('people', 'revokeInvite', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManagePeople(ctx.role)) return { ok: false, error: FORBIDDEN };
  if (!z.string().uuid().safeParse(inviteId).success) return { ok: false, error: GENERIC_ERROR };
  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(invitation)
        .set({ status: 'revoked', updatedAt: new Date() })
        .where(and(eq(invitation.id, inviteId), eq(invitation.circleId, ctx.circleId), eq(invitation.status, 'pending')))
        .returning({ id: invitation.id });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'invitation', entityId: inviteId, summary: 'Revoked an invitation' },
        tx,
      );
    });
    serverLog('people', 'revokeInvite', 'success', { actor: ctx.userId, id: inviteId });
    return { ok: true };
  } catch (err) {
    serverLog('people', 'revokeInvite', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Re-send a pending invitation email (extends its expiry and ROTATES the link). */
export async function resendInvite(inviteId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('people', 'resendInvite', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManagePeople(ctx.role)) return { ok: false, error: FORBIDDEN };
  if (!z.string().uuid().safeParse(inviteId).success) return { ok: false, error: GENERIC_ERROR };
  // 🔒 Tokens are hashed at rest, so the original secret can't be re-read — and shouldn't be:
  // resending mints a FRESH token, which also invalidates the previously emailed link (the safe
  // default when someone says "I never got it / I lost it").
  const newToken = randomToken();
  try {
    const sent = await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(invitation)
        .set({ token: hashToken(newToken), expiresAt: new Date(Date.now() + INVITE_TTL_MS), updatedAt: new Date() })
        .where(and(eq(invitation.id, inviteId), eq(invitation.circleId, ctx.circleId), eq(invitation.status, 'pending')))
        .returning({ email: invitation.email, role: invitation.role });
      if (!row) throw new Error('not_found_or_forbidden');
      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, ctx.circleId))
        .limit(1);
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'invite', entityType: 'invitation', entityId: inviteId, summary: 'Resent an invitation' },
        tx,
      );
      return { ...row, recipientName: recipient?.fullName ?? 'your care circle' };
    });

    const origin = await getAppOrigin();
    try {
      await sendInvitationEmail({
        to: sent.email,
        inviteUrl: `${origin}/invite/${newToken}`,
        inviterName: ctx.name?.trim() || 'A family member',
        recipientName: sent.recipientName,
        role: sent.role,
      });
    } catch (err) {
      console.error('[people] resend invite email failed:', (err as Error)?.name ?? 'error');
    }
    serverLog('people', 'resendInvite', 'success', { actor: ctx.userId, email: maskEmail(sent.email) });
    return { ok: true };
  } catch (err) {
    serverLog('people', 'resendInvite', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
