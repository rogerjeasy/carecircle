import 'server-only';

/**
 * Read layer for the Health screen — loads the active circle's recorded vitals + members, shaped
 * as the client renders. Security (see AGENTS.md): RLS-scoped via `withAuthedDb()`, pinned to the
 * active circle.
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { observation, careRecipientProfile, membership, users } from '@/db/schema';
import type { HealthData, Member, MetricKey, Reading } from '@/components/health/types';

const AVATAR_COLORS = [
  'bg-primary/10 text-primary',
  'bg-accent/10 text-accent',
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

/** Load the active circle's vitals + members. Null if unauthenticated / no active circle. */
export async function getHealthData(): Promise<HealthData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('health', 'getHealthData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const data = await withAuthedDb(async (tx) => {
      const readingRows = await tx
        .select({
          id: observation.id,
          metric: observation.metric,
          value: observation.value,
          secondary: observation.secondary,
          recordedAt: observation.recordedAt,
          note: observation.note,
          recordedByMembershipId: observation.recordedByMembershipId,
        })
        .from(observation)
        .where(and(eq(observation.circleId, circleId), isNull(observation.deletedAt)))
        .orderBy(asc(observation.recordedAt));

      const memberRows = await tx
        .select({ id: membership.id, userId: membership.userId, name: users.name })
        .from(membership)
        .leftJoin(users, eq(users.id, membership.userId))
        .where(
          and(eq(membership.circleId, circleId), eq(membership.status, 'active'), isNull(membership.deletedAt)),
        )
        .orderBy(asc(membership.createdAt));

      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1);

      return { readingRows, memberRows, recipient };
    });

    const members: Member[] = data.memberRows.map((m, i) => {
      const name = m.name ?? 'Member';
      return { id: m.id, name, initials: initialsFrom(name), color: AVATAR_COLORS[i % AVATAR_COLORS.length] };
    });
    const currentMembershipId = data.memberRows.find((m) => m.userId === userId)?.id ?? null;

    const readings: Reading[] = data.readingRows.map((r) => ({
      id: r.id,
      metric: r.metric as MetricKey,
      at: r.recordedAt,
      value: r.value,
      secondary: r.secondary ?? undefined,
      note: r.note ?? undefined,
      recordedBy: r.recordedByMembershipId ?? '',
    }));

    const recipientName = data.recipient?.fullName?.trim().split(/\s+/)[0] ?? null;

    serverLog('health', 'getHealthData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      readings: readings.length,
      members: members.length,
    });

    return { circleId, readings, members, currentMembershipId, recipientName };
  } catch (err) {
    serverLog('health', 'getHealthData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
