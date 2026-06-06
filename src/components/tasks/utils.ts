// Pure helpers shared across the Tasks screen.

import { format, isToday, isTomorrow, isYesterday, startOfDay } from "date-fns";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import { MEMBERS } from "./data";
import type { Member, Task, TaskStatus } from "./types";

/** Managing tasks is open to active caregiving roles; recipients/read-only view. */
export function canManageTasks(role: UserRole): boolean {
  return role === "coordinator" || role === "family" || role === "caregiver";
}

export function memberById(id: string | null | undefined): Member | undefined {
  if (!id) return undefined;
  return MEMBERS.find((m) => m.id === id);
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** A task is overdue when it's not done and its due date is before today. */
export function isOverdue(task: Task, now: Date): boolean {
  if (!task.due || task.status === "done") return false;
  return startOfDay(task.due).getTime() < startOfDay(now).getTime();
}

/** "Today" / "Tomorrow" / "Yesterday" / "Jun 9" — a short due-date label. */
export function dueLabel(due: Date): string {
  if (isToday(due)) return "Today";
  if (isTomorrow(due)) return "Tomorrow";
  if (isYesterday(due)) return "Yesterday";
  return format(due, "MMM d");
}

export interface FairShareRow {
  member: Member;
  count: number;
}

/** Completed-task counts per member this "week" (the demo treats all `done` tasks as this week). */
export function fairShare(tasks: Task[]): FairShareRow[] {
  const counts = new Map<string, number>();
  tasks
    .filter((t) => t.status === "done" && t.assigneeId)
    .forEach((t) => counts.set(t.assigneeId!, (counts.get(t.assigneeId!) ?? 0) + 1));
  return MEMBERS.map((member) => ({ member, count: counts.get(member.id) ?? 0 })).sort(
    (a, b) => b.count - a.count
  );
}

/**
 * A gentle, non-judgmental read on how balanced the week is. Returns the headline + whether it's
 * the "balanced" (positive) or "imbalanced" (ask-for-help) tone, for colour treatment.
 */
export function fairShareMessage(rows: FairShareRow[]): { text: string; tone: "balanced" | "uneven" } {
  const active = rows.filter((r) => r.count > 0);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (total === 0 || active.length === 0) {
    return { text: "No tasks completed yet this week — a fresh start.", tone: "balanced" };
  }
  const top = rows[0];
  const share = top.count / total;
  // One person doing well over half the work (and more than one contributor expected) → nudge.
  if (active.length > 1 && share >= 0.5) {
    return {
      text: `${firstName(top.member.name)}'s carrying a lot — anyone able to help?`,
      tone: "uneven",
    };
  }
  if (active.length === 1 && total >= 3) {
    return {
      text: `${firstName(top.member.name)}'s handled everything so far — share the load?`,
      tone: "uneven",
    };
  }
  return { text: "Nicely balanced this week 💚", tone: "balanced" };
}

/** Tasks in a column, sorted by their manual order. */
export function tasksInColumn(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);
}
