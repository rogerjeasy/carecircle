// Pure helpers shared across the Tasks screen.

import { isToday, isTomorrow, isYesterday, startOfDay } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import type { Member, Task, TaskStatus } from "./types";

/** Localized relative-day labels, supplied by the component from messages. */
export interface RelativeLabels {
  today: string;
  tomorrow: string;
  yesterday: string;
}

/** Managing tasks is open to active caregiving roles; recipients/read-only view. */
export function canManageTasks(role: UserRole): boolean {
  return role === "coordinator" || role === "family" || role === "caregiver";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** A task is overdue when it's not done and its due date is before today. */
export function isOverdue(task: Task, now: Date): boolean {
  if (!task.due || task.status === "done") return false;
  return startOfDay(task.due).getTime() < startOfDay(now).getTime();
}

/** "Today" / "Tomorrow" / "Yesterday" / "Jun 9" — a short, locale-aware due-date label. */
export function dueLabel(locale: string, due: Date, labels: RelativeLabels): string {
  if (isToday(due)) return labels.today;
  if (isTomorrow(due)) return labels.tomorrow;
  if (isYesterday(due)) return labels.yesterday;
  return due.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export interface FairShareRow {
  member: Member;
  count: number;
}

/** Completed-task counts per member (treats all `done` tasks as this week's contribution). */
export function fairShare(tasks: Task[], members: Member[]): FairShareRow[] {
  const counts = new Map<string, number>();
  tasks
    .filter((t) => t.status === "done" && t.assigneeId)
    .forEach((t) => counts.set(t.assigneeId!, (counts.get(t.assigneeId!) ?? 0) + 1));
  return members.map((member) => ({ member, count: counts.get(member.id) ?? 0 })).sort(
    (a, b) => b.count - a.count
  );
}

/**
 * A gentle, non-judgmental read on how balanced the week is. Returns a stable message KEY (resolved
 * to localized copy by the panel), the relevant person's first name, and the tone for colour.
 */
export type FairShareKey = "freshStart" | "carryingALot" | "handledEverything" | "balanced";

export function fairShareMessage(rows: FairShareRow[]): {
  key: FairShareKey;
  name?: string;
  tone: "balanced" | "uneven";
} {
  const active = rows.filter((r) => r.count > 0);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (total === 0 || active.length === 0) {
    return { key: "freshStart", tone: "balanced" };
  }
  const top = rows[0];
  const share = top.count / total;
  // One person doing well over half the work (and more than one contributor expected) → nudge.
  if (active.length > 1 && share >= 0.5) {
    return { key: "carryingALot", name: firstName(top.member.name), tone: "uneven" };
  }
  if (active.length === 1 && total >= 3) {
    return { key: "handledEverything", name: firstName(top.member.name), tone: "uneven" };
  }
  return { key: "balanced", tone: "balanced" };
}

/** Tasks in a column, sorted by their manual order. */
export function tasksInColumn(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);
}
