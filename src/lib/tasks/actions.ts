'use server';

/**
 * Tasks server actions — create, edit, move (status + completion), and delete.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Each action re-checks `requireSession()` and re-authorizes against the user's REAL membership
 *    role in the active circle. RLS (drizzle/0017) is the final backstop.
 *  - All writes run through `withAuthedDb()` (RLS-scoped) and are audited.
 *  - Title/details can be free text, so create/edit take FormData (Next's dev logger never prints
 *    FormData contents); logs carry ids/counts, not content.
 */
import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { tasks as taskTable, membership, timelineEvent } from '@/db/schema';
import { canManageTasks } from './access';
import type { Recurrence, Task, TaskCategory, TaskStatus } from '@/components/tasks/types';

export type ActionError = { ok: false; error: string };
export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | ActionError;

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';

interface ActorContext {
  userId: string;
  name: string | null | undefined;
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
  return { userId: user.id, name: user.name, circleId, membershipId: m.id, role: m.role };
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Someone';
}

const taskPayloadSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title').max(140),
  details: z.string().trim().max(500).optional().default(''),
  category: z.enum(['errand', 'medical', 'admin', 'refill', 'visit']),
  status: z.enum(['open', 'doing', 'done']),
  assigneeId: z.string().uuid().optional().or(z.literal('')),
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  recurrence: z.enum(['none', 'daily', 'weekly', 'custom']),
});
type TaskPayload = z.infer<typeof taskPayloadSchema>;

function readPayload(formData: FormData): unknown {
  const raw = formData.get('payload');
  if (!raw) return {};
  try {
    return JSON.parse(raw.toString());
  } catch {
    return {};
  }
}

type TaskRow = typeof taskTable.$inferSelect;
function buildTaskDTO(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    details: row.details ?? undefined,
    category: row.category as TaskCategory,
    status: row.status as TaskStatus,
    assigneeId: row.assignedToMembershipId,
    due: row.dueAt ?? null,
    recurrence: (row.recurrence ?? 'none') as Recurrence,
    order: row.sortOrder,
  };
}

/** Resolve a requested assignee to a membership id that actually belongs to this circle (else null). */
async function validAssignee(
  tx: Parameters<Parameters<typeof withAuthedDb>[0]>[0],
  circleId: string,
  assigneeId: string | undefined,
): Promise<string | null> {
  if (!assigneeId) return null;
  const [m] = await tx
    .select({ id: membership.id })
    .from(membership)
    .where(and(eq(membership.id, assigneeId), eq(membership.circleId, circleId), isNull(membership.deletedAt)))
    .limit(1);
  return m?.id ?? null;
}

/** Next manual order at the bottom of a status column. */
async function nextOrder(
  tx: Parameters<Parameters<typeof withAuthedDb>[0]>[0],
  circleId: string,
  status: TaskStatus,
): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${taskTable.sortOrder}), -1)::int` })
    .from(taskTable)
    .where(and(eq(taskTable.circleId, circleId), eq(taskTable.status, status), isNull(taskTable.deletedAt)));
  return (row?.max ?? -1) + 1;
}

// ---------------------------------------------------------------------------

/** Create a task. Returns the created Task for instant reconciliation. */
export async function createTask(formData: FormData): Promise<ActionResult<Task>> {
  const ctx = await getActorContext();
  serverLog('tasks', 'createTask', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageTasks(ctx.role)) {
    serverLog('tasks', 'createTask', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }
  const parsed = taskPayloadSchema.safeParse(readPayload(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the task.' };
  const p: TaskPayload = parsed.data;

  try {
    const row = await withAuthedDb(async (tx) => {
      const assignee = await validAssignee(tx, ctx.circleId, p.assigneeId || undefined);
      const order = await nextOrder(tx, ctx.circleId, p.status);
      const isDone = p.status === 'done';
      const [created] = await tx
        .insert(taskTable)
        .values({
          circleId: ctx.circleId,
          title: p.title,
          details: p.details || null,
          category: p.category,
          status: p.status,
          assignedToMembershipId: assignee,
          dueAt: p.due ? new Date(`${p.due}T00:00:00`) : null,
          recurrence: p.recurrence,
          sortOrder: order,
          completedAt: isDone ? new Date() : null,
          completedByMembershipId: isDone ? ctx.membershipId : null,
          createdByMembershipId: ctx.membershipId,
        })
        .returning();

      await tx.insert(timelineEvent).values({
        circleId: ctx.circleId,
        actorMembershipId: ctx.membershipId,
        eventType: 'task',
        summary: `${firstName(ctx.name)} added a task: ${p.title}`,
        refType: 'task',
        refId: created.id,
      });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'task', entityId: created.id, summary: 'Created a task' },
        tx,
      );
      return created;
    });

    serverLog('tasks', 'createTask', 'success', { actor: ctx.userId, id: row.id });
    return { ok: true, data: buildTaskDTO(row) };
  } catch (err) {
    serverLog('tasks', 'createTask', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Edit a task. Returns the updated Task. */
export async function updateTask(formData: FormData): Promise<ActionResult<Task>> {
  const ctx = await getActorContext();
  serverLog('tasks', 'updateTask', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageTasks(ctx.role)) return { ok: false, error: FORBIDDEN };

  const taskId = z.string().uuid().safeParse(formData.get('id')?.toString());
  const parsed = taskPayloadSchema.safeParse(readPayload(formData));
  if (!taskId.success || !parsed.success) return { ok: false, error: parsed.success ? GENERIC_ERROR : parsed.error.issues[0]?.message ?? 'Please check the task.' };
  const id = taskId.data;
  const p = parsed.data;

  try {
    const row = await withAuthedDb(async (tx) => {
      const assignee = await validAssignee(tx, ctx.circleId, p.assigneeId || undefined);
      // Read the current status so we can manage completion fields if it changes.
      const [current] = await tx
        .select({ status: taskTable.status })
        .from(taskTable)
        .where(and(eq(taskTable.id, id), eq(taskTable.circleId, ctx.circleId), isNull(taskTable.deletedAt)))
        .limit(1);
      if (!current) throw new Error('not_found_or_forbidden');

      const becomingDone = p.status === 'done' && current.status !== 'done';
      const leavingDone = p.status !== 'done' && current.status === 'done';

      const [updated] = await tx
        .update(taskTable)
        .set({
          title: p.title,
          details: p.details || null,
          category: p.category,
          status: p.status,
          assignedToMembershipId: assignee,
          dueAt: p.due ? new Date(`${p.due}T00:00:00`) : null,
          recurrence: p.recurrence,
          ...(becomingDone ? { completedAt: new Date(), completedByMembershipId: ctx.membershipId } : {}),
          ...(leavingDone ? { completedAt: null, completedByMembershipId: null } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(taskTable.id, id), eq(taskTable.circleId, ctx.circleId), isNull(taskTable.deletedAt)))
        .returning();

      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'task', entityId: id, summary: 'Updated a task' },
        tx,
      );
      return updated;
    });

    serverLog('tasks', 'updateTask', 'success', { actor: ctx.userId, id });
    return { ok: true, data: buildTaskDTO(row) };
  } catch (err) {
    serverLog('tasks', 'updateTask', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

const statusSchema = z.enum(['open', 'doing', 'done']);

/** Move a task to a column (board drag / move menu / done checkbox). Manages completion fields. */
export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('tasks', 'setTaskStatus', 'start', { actor: ctx?.userId, status });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageTasks(ctx.role)) return { ok: false, error: FORBIDDEN };
  const id = z.string().uuid().safeParse(taskId);
  const st = statusSchema.safeParse(status);
  if (!id.success || !st.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const order = await nextOrder(tx, ctx.circleId, st.data);
      const isDone = st.data === 'done';
      const [row] = await tx
        .update(taskTable)
        .set({
          status: st.data,
          sortOrder: order,
          completedAt: isDone ? new Date() : null,
          completedByMembershipId: isDone ? ctx.membershipId : null,
          updatedAt: new Date(),
        })
        .where(and(eq(taskTable.id, id.data), eq(taskTable.circleId, ctx.circleId), isNull(taskTable.deletedAt)))
        .returning({ id: taskTable.id, title: taskTable.title });
      if (!row) throw new Error('not_found_or_forbidden');

      if (isDone) {
        await tx.insert(timelineEvent).values({
          circleId: ctx.circleId,
          actorMembershipId: ctx.membershipId,
          eventType: 'task',
          summary: `${firstName(ctx.name)} completed: ${row.title}`,
          refType: 'task',
          refId: row.id,
        });
      }
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'task', entityId: id.data, summary: `Moved a task to ${st.data}` },
        tx,
      );
    });
    serverLog('tasks', 'setTaskStatus', 'success', { actor: ctx.userId, id: id.data, status: st.data });
    return { ok: true };
  } catch (err) {
    serverLog('tasks', 'setTaskStatus', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Delete a task (soft-delete). */
export async function deleteTask(taskId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('tasks', 'deleteTask', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageTasks(ctx.role)) return { ok: false, error: FORBIDDEN };
  const id = z.string().uuid().safeParse(taskId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(taskTable)
        .set({ deletedAt: new Date() })
        .where(and(eq(taskTable.id, id.data), eq(taskTable.circleId, ctx.circleId), isNull(taskTable.deletedAt)))
        .returning({ id: taskTable.id });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'task', entityId: id.data, summary: 'Deleted a task' },
        tx,
      );
    });
    serverLog('tasks', 'deleteTask', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('tasks', 'deleteTask', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
