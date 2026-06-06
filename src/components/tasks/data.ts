// Demo seed data + display constants for the Tasks screen.
// (Static mock data — the real app would load these from the circle-scoped DAL.)

import { Car, ClipboardList, FileText, Pill, Stethoscope } from "lucide-react";
import { addDays, startOfDay } from "date-fns";
import type { Member, Task, TaskCategory, TaskSeed, TaskStatus } from "./types";

/** Circle members (mirrors the appointments cast + adds a fair-share bar colour). */
export const MEMBERS: Member[] = [
  { id: "maria", name: "Maria Rodriguez", initials: "MR", color: "bg-accent/10 text-accent", bar: "hsl(var(--chart-2))" },
  { id: "grace", name: "Grace Martinez", initials: "GM", color: "bg-primary/10 text-primary", bar: "hsl(var(--chart-1))" },
  { id: "paolo", name: "Paolo Bianchi", initials: "PB", color: "bg-info/10 text-info", bar: "hsl(var(--chart-5))" },
  { id: "carlos", name: "Carlos Rodriguez", initials: "CR", color: "bg-success/10 text-success", bar: "hsl(var(--chart-3))" },
];

export const STATUS_COLUMNS: { id: TaskStatus; label: string; hint: string }[] = [
  { id: "open", label: "Open", hint: "Not started" },
  { id: "doing", label: "Doing", hint: "In progress" },
  { id: "done", label: "Done", hint: "Completed" },
];

export const categoryMeta: Record<
  TaskCategory,
  { label: string; icon: typeof Car; tint: string }
> = {
  errand: { label: "Errand", icon: Car, tint: "bg-info/10 text-info" },
  medical: { label: "Medical", icon: Stethoscope, tint: "bg-accent/10 text-accent" },
  admin: { label: "Admin", icon: FileText, tint: "bg-muted text-muted-foreground" },
  refill: { label: "Refill", icon: Pill, tint: "bg-primary/10 text-primary" },
  visit: { label: "Visit", icon: ClipboardList, tint: "bg-success/10 text-success" },
};

export const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = (
  Object.keys(categoryMeta) as TaskCategory[]
).map((value) => ({ value, label: categoryMeta[value].label }));

export const RECURRENCE_OPTIONS: { value: Task["recurrence"]; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom…" },
];

const seed: TaskSeed[] = [
  // Open
  { id: "t1", title: "Pick up prescription refill", details: "Metformin & Lisinopril at Maple Pharmacy.", category: "refill", status: "open", assigneeId: "paolo", dueOffset: 0, recurrence: "none", order: 0 },
  { id: "t2", title: "Book podiatry appointment", category: "admin", status: "open", assigneeId: "maria", dueOffset: 3, recurrence: "none", order: 1 },
  { id: "t3", title: "Buy groceries for the week", details: "Low-salt options, fresh fruit.", category: "errand", status: "open", assigneeId: "carlos", dueOffset: 1, recurrence: "weekly", order: 2 },
  { id: "t4", title: "Submit insurance reimbursement form", category: "admin", status: "open", assigneeId: null, dueOffset: -2, recurrence: "none", order: 3 },
  // Doing
  { id: "t5", title: "Take Antonio to physiotherapy", details: "9:00 AM — home visit.", category: "visit", status: "doing", assigneeId: "paolo", dueOffset: 0, recurrence: "weekly", order: 0 },
  { id: "t6", title: "Update the medication list", category: "medical", status: "doing", assigneeId: "grace", dueOffset: 1, recurrence: "none", order: 1 },
  // Done
  { id: "t7", title: "Morning medications given", category: "medical", status: "done", assigneeId: "grace", dueOffset: 0, recurrence: "daily", order: 0 },
  { id: "t8", title: "Refill weekly pill organiser", category: "refill", status: "done", assigneeId: "grace", dueOffset: -1, recurrence: "weekly", order: 1 },
  { id: "t9", title: "Drive to cardiology check-up", category: "visit", status: "done", assigneeId: "paolo", dueOffset: -1, recurrence: "none", order: 2 },
  { id: "t10", title: "Pay the care-agency invoice", category: "admin", status: "done", assigneeId: "maria", dueOffset: -2, recurrence: "none", order: 3 },
  { id: "t11", title: "Tidy and restock the bathroom", category: "errand", status: "done", assigneeId: "grace", dueOffset: -3, recurrence: "none", order: 4 },
  { id: "t12", title: "Call the GP about test results", category: "medical", status: "done", assigneeId: "grace", dueOffset: -2, recurrence: "none", order: 5 },
];

/** Resolve the seed into concrete `Task`s relative to a fixed "today" captured by the screen. */
export function buildTasks(now: Date): Task[] {
  return seed.map(({ dueOffset, ...rest }) => ({
    ...rest,
    due: dueOffset === null ? null : addDays(startOfDay(now), dueOffset),
  }));
}
