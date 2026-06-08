import 'server-only';

/**
 * Read layer for the Care Rota — the active circle's weekly shifts + the members who can take them.
 * Security (see AGENTS.md): RLS-scoped via `withAuthedDb()`, pinned to the active circle.
 */
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { careShift, membership, users } from '@/db/schema';
import type { Member, RotaData, Shift, ShiftType } from '@/components/rota/types';

const ASSIGNABLE_ROLES = ['owner', 'family_admin', 'family', 'caregiver'];

// Per-member styling (avatar tint + shift-block classes), assigned by join order.
const PALETTE: { color: string; block: string }[] = [
  { color: 'bg-primary/10 text-primary', block: 'bg-primary/10 border-primary/30 text-primary' },
  { color: 'bg-accent/10 text-accent', block: 'bg-accent/10 border-accent/30 text-accent-foreground' },
  { color: 'bg-info/10 text-info', block: 'bg-info/10 border-info/30 text-info' },
  { color: 'bg-success/10 text-success', block: 'bg-success/10 border-success/30 text-success' },
  { color: 'bg-warning/10 text-warning', block: 'bg-warning/10 border-warning/30 text-warning' },
];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Load the active circle's rota + members. Null if unauthenticated / no active circle. */
export async function getRotaData(): Promise<RotaData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('rota', 'getRotaData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const data = await withAuthedDb(async (tx) => {
      const shiftRows = await tx
        .select({
          id: careShift.id,
          assignedToMembershipId: careShift.assignedToMembershipId,
          dayIndex: careShift.dayIndex,
          startTime: careShift.startTime,
          endTime: careShift.endTime,
          shiftType: careShift.shiftType,
        })
        .from(careShift)
        .where(and(eq(careShift.circleId, circleId), isNull(careShift.deletedAt)))
        .orderBy(asc(careShift.dayIndex));

      const memberRows = await tx
        .select({ id: membership.id, name: users.name })
        .from(membership)
        .leftJoin(users, eq(users.id, membership.userId))
        .where(
          and(
            eq(membership.circleId, circleId),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
            inArray(membership.role, ASSIGNABLE_ROLES as never[]),
          ),
        )
        .orderBy(asc(membership.createdAt));

      return { shiftRows, memberRows };
    });

    const members: Member[] = data.memberRows.map((m, i) => {
      const name = m.name ?? 'Member';
      const tone = PALETTE[i % PALETTE.length];
      return { id: m.id, name, initials: initialsFrom(name), color: tone.color, block: tone.block };
    });

    // Drop shifts whose member is no longer assignable/active (set-null on removal).
    const memberIds = new Set(members.map((m) => m.id));
    const shifts: Shift[] = data.shiftRows
      .filter((s) => s.assignedToMembershipId && memberIds.has(s.assignedToMembershipId))
      .map((s) => ({
        id: s.id,
        memberId: s.assignedToMembershipId as string,
        dayIndex: s.dayIndex,
        start: s.startTime,
        end: s.endTime,
        type: s.shiftType as ShiftType,
      }));

    serverLog('rota', 'getRotaData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      shifts: shifts.length,
      members: members.length,
    });

    return { circleId, shifts, members };
  } catch (err) {
    serverLog('rota', 'getRotaData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
