import 'server-only';

/**
 * Read layer for the People screen — the active circle's members (from `membership`) and pending
 * invitations (from `invitation`), shaped as the client renders.
 *
 * Security (see AGENTS.md): RLS-scoped via `withAuthedDb()`, pinned to the active circle. The
 * membership/invitation RLS policies already constrain visibility to the caller's circles.
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { membership, invitation, users, careRecipientProfile } from '@/db/schema';
import { dbRoleToCircleRole } from './access';
import type { Invite, Member, MemberStatus, PeopleData } from '@/components/people/types';

const AVATAR_COLORS = [
  'bg-accent/10 text-accent',
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Load the active circle's members + pending invites. Null if unauthenticated / no active circle. */
export async function getPeopleData(): Promise<PeopleData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('people', 'getPeopleData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const data = await withAuthedDb(async (tx) => {
      const memberRows = await tx
        .select({
          id: membership.id,
          role: membership.role,
          status: membership.status,
          relationship: membership.relationshipLabel,
          phone: membership.phone,
          name: users.name,
          email: users.email,
        })
        .from(membership)
        .innerJoin(users, eq(users.id, membership.userId))
        .where(and(eq(membership.circleId, circleId), isNull(membership.deletedAt)))
        .orderBy(asc(membership.createdAt));

      const inviteRows = await tx
        .select({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          createdAt: invitation.createdAt,
        })
        .from(invitation)
        .where(
          and(eq(invitation.circleId, circleId), eq(invitation.status, 'pending'), isNull(invitation.deletedAt)),
        )
        .orderBy(asc(invitation.createdAt));

      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1);

      return { memberRows, inviteRows, recipient };
    });

    const members: Member[] = data.memberRows.map((m, i) => {
      const name = m.name ?? m.email ?? 'Member';
      return {
        id: m.id,
        name,
        initials: initialsFrom(name),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        email: m.email ?? '',
        phone: m.phone ?? '',
        relationship: m.relationship ?? '—',
        role: dbRoleToCircleRole(m.role),
        status: m.status as MemberStatus,
        // Per-circle "last active" isn't tracked yet — shown as "—".
        lastActive: null,
      };
    });

    const invites: Invite[] = data.inviteRows.map((iv) => ({
      id: iv.id,
      email: iv.email,
      role: dbRoleToCircleRole(iv.role),
      sentAt: iv.createdAt,
    }));

    const recipientName = data.recipient?.fullName?.trim().split(/\s+/)[0] ?? null;

    serverLog('people', 'getPeopleData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      members: members.length,
      invites: invites.length,
    });

    return { circleId, members, invites, recipientName };
  } catch (err) {
    serverLog('people', 'getPeopleData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
