import 'server-only';

/**
 * Read layer for the Tasks board — loads the active circle's tasks and its assignable members
 * (for the assignee picker + fair-share chart), shaped exactly as the client components render.
 *
 * Security (see AGENTS.md): RLS-scoped via `withAuthedDb()` and pinned to the active circle.
 * Reading one's own circle's board is normal app data → operational `serverLog` only.
 */
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { tasks as taskTable, membership, users } from '@/db/schema';
import type {
  Member,
  Recurrence,
  Task,
  TaskCategory,
  TasksData,
  TaskStatus,
} from '@/components/tasks/types';

// Roles that share the caregiving load — offered as assignees + tracked in fair-share.
const ASSIGNABLE_ROLES = ['owner', 'family_admin', 'family', 'caregiver'];

// Deterministic per-member styling (avatar tint + fair-share bar colour), assigned by join order.
const AVATAR_COLORS = [
  'bg-accent/10 text-accent',
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
];
const BAR_COLORS = [
  'hsl(var(--chart-2))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Load the active circle's tasks + assignable members. Returns null if unauthenticated / no circle. */
export async function getTasksData(): Promise<TasksData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('tasks', 'getTasksData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const data = await withAuthedDb(async (tx) => {
      const taskRows = await tx
        .select({
          id: taskTable.id,
          title: taskTable.title,
          details: taskTable.details,
          category: taskTable.category,
          status: taskTable.status,
          assignedToMembershipId: taskTable.assignedToMembershipId,
          dueAt: taskTable.dueAt,
          recurrence: taskTable.recurrence,
          sortOrder: taskTable.sortOrder,
        })
        .from(taskTable)
        .where(and(eq(taskTable.circleId, circleId), isNull(taskTable.deletedAt)))
        .orderBy(asc(taskTable.sortOrder));

      const memberRows = await tx
        .select({ id: membership.id, role: membership.role, name: users.name })
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

      return { taskRows, memberRows };
    });

    const members: Member[] = data.memberRows.map((m, i) => {
      const name = m.name ?? 'Member';
      return {
        id: m.id,
        name,
        initials: initialsFrom(name),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        bar: BAR_COLORS[i % BAR_COLORS.length],
      };
    });

    const tasks: Task[] = data.taskRows.map((t) => ({
      id: t.id,
      title: t.title,
      details: t.details ?? undefined,
      category: t.category as TaskCategory,
      status: t.status as TaskStatus,
      assigneeId: t.assignedToMembershipId,
      due: t.dueAt ?? null,
      recurrence: (t.recurrence ?? 'none') as Recurrence,
      order: t.sortOrder,
    }));

    serverLog('tasks', 'getTasksData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      tasks: tasks.length,
      members: members.length,
    });

    return { circleId, tasks, members };
  } catch (err) {
    serverLog('tasks', 'getTasksData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
