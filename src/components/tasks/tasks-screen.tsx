"use client";

import * as React from "react";
import { toast } from "sonner";
import { LayoutGrid, List as ListIcon, Lock, Plus } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoardView } from "./board-view";
import { ListView } from "./list-view";
import { FairSharePanel } from "./fair-share-panel";
import { FiltersBar, DEFAULT_FILTERS, type TaskFilters } from "./filters-bar";
import { TaskFormModal } from "./task-form-modal";
import { GatedControl } from "./gated-control";
import { TaskMembersProvider } from "./members-context";
import { canManageTasks } from "./utils";
import { emptyTaskValues, type TaskFormValues } from "./schema";
import { taskToValues, valuesToTask } from "./mapping";
import { createTask, updateTask, setTaskStatus, deleteTask as deleteTaskAction } from "@/lib/tasks/actions";
import type { Task, TasksData, TaskStatus } from "./types";

type ModalState =
  | { mode: "add"; status: TaskStatus }
  | { mode: "edit"; task: Task }
  | null;

export interface TasksScreenProps {
  /** Real tasks + members loaded server-side, or null when there's no circle/data. */
  initial: TasksData | null;
}

function valuesToPayload(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    details: values.details.trim(),
    category: values.category,
    status: values.status,
    assigneeId: values.assigneeId || "",
    due: values.due || "",
    recurrence: values.recurrence,
  };
}

/** The Tasks screen: Board / List toggle, filters, fair-share, and a new-task form — server-backed. */
export function TasksScreen({ initial }: TasksScreenProps) {
  const { role } = useAppShell();
  const canManage = canManageTasks(role);

  const [now] = React.useState(() => new Date());
  const [tasks, setTasks] = React.useState<Task[]>(initial?.tasks ?? []);
  const [view, setView] = React.useState<"board" | "list">("board");
  const [filters, setFilters] = React.useState<TaskFilters>(DEFAULT_FILTERS);
  const [modal, setModal] = React.useState<ModalState>(null);

  const members = initial?.members ?? [];

  const filtered = React.useMemo(
    () =>
      tasks.filter((t) => {
        if (filters.assignee !== "all") {
          if (filters.assignee === "unassigned" ? t.assigneeId : t.assigneeId !== filters.assignee) return false;
        }
        if (filters.category !== "all" && t.category !== filters.category) return false;
        if (filters.status !== "all" && t.status !== filters.status) return false;
        return true;
      }),
    [tasks, filters]
  );

  const nextOrder = React.useCallback(
    (status: TaskStatus) =>
      tasks.filter((t) => t.status === status).reduce((max, t) => Math.max(max, t.order), -1) + 1,
    [tasks]
  );

  /** Optimistically move a task to a column, then persist (revert on failure). */
  const changeStatus = (id: string, status: TaskStatus) => {
    const prev = tasks;
    setTasks((p) => {
      const order = p.filter((t) => t.status === status).reduce((m, t) => Math.max(m, t.order), -1) + 1;
      return p.map((t) => (t.id === id ? { ...t, status, order } : t));
    });
    void setTaskStatus(id, status).then((res) => {
      if (!res.ok) {
        setTasks(prev);
        toast.error(res.error ?? "Couldn't move the task");
      }
    });
  };

  const moveTask = (id: string, status: TaskStatus) => changeStatus(id, status);

  const toggleDone = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    changeStatus(id, task.status === "done" ? "open" : "done");
  };

  const deleteTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    const prev = tasks;
    setTasks((p) => p.filter((t) => t.id !== id));
    toast(`${task?.title ?? "Task"} deleted`);
    void deleteTaskAction(id).then((res) => {
      if (!res.ok) {
        setTasks(prev);
        toast.error(res.error ?? "Couldn't delete the task");
      }
    });
  };

  const handleSubmit = async (values: TaskFormValues) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(valuesToPayload(values)));

    if (modal?.mode === "edit") {
      const original = modal.task;
      const optimistic = valuesToTask(values, original.id, original.order, original);
      setTasks((p) => p.map((t) => (t.id === original.id ? optimistic : t)));
      setModal(null);
      fd.set("id", original.id);
      const res = await updateTask(fd);
      if (res.ok) {
        setTasks((p) => p.map((t) => (t.id === original.id ? res.data : t)));
        toast.success(`${res.data.title} updated`);
      } else {
        setTasks((p) => p.map((t) => (t.id === original.id ? original : t)));
        toast.error(res.error ?? "Couldn't save the task");
      }
    } else {
      const tempId = `task-temp-${Date.now()}`;
      const optimistic = valuesToTask(values, tempId, nextOrder(values.status));
      setTasks((p) => [optimistic, ...p]);
      setModal(null);
      const res = await createTask(fd);
      if (res.ok) {
        setTasks((p) => p.map((t) => (t.id === tempId ? res.data : t)));
        toast.success(`${res.data.title} added`);
      } else {
        setTasks((p) => p.filter((t) => t.id !== tempId));
        toast.error(res.error ?? "Couldn't add the task");
      }
    }
  };

  const openAdd = (status: TaskStatus = "open") => setModal({ mode: "add", status });

  return (
    <TaskMembersProvider members={members}>
      <div className="space-y-5">
        {/* Header + view toggle + new task */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h1>
            <p className="mt-1 text-muted-foreground">Share the caregiving load and keep things moving.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!canManage && (
              <Badge variant="secondary" className="gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                View only
              </Badge>
            )}
            <Tabs value={view} onValueChange={(v) => setView(v as "board" | "list")}>
              <TabsList>
                <TabsTrigger value="board">
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                  Board
                </TabsTrigger>
                <TabsTrigger value="list">
                  <ListIcon className="h-4 w-4" aria-hidden="true" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <GatedControl canManage={canManage}>
              <Button onClick={() => openAdd("open")}>
                <Plus className="h-4 w-4" />
                <span className="ml-1">New task</span>
              </Button>
            </GatedControl>
          </div>
        </div>

        {/* Filters */}
        <FiltersBar filters={filters} onChange={setFilters} />

        {/* Content */}
        {view === "board" ? (
          <div className="flex flex-col gap-6 xl:flex-row">
            <div className="min-w-0 flex-1">
              <BoardView
                tasks={filtered}
                now={now}
                canManage={canManage}
                onToggleDone={toggleDone}
                onMoveTask={moveTask}
                onEditTask={(task) => setModal({ mode: "edit", task })}
                onDeleteTask={deleteTask}
                onAddInColumn={openAdd}
              />
            </div>
            <div className="w-full shrink-0 xl:w-80 xl:sticky xl:top-20 xl:self-start">
              <FairSharePanel tasks={tasks} />
            </div>
          </div>
        ) : (
          <ListView
            tasks={filtered}
            now={now}
            canManage={canManage}
            onToggleDone={toggleDone}
            onMoveTask={moveTask}
            onEditTask={(task) => setModal({ mode: "edit", task })}
            onDeleteTask={deleteTask}
          />
        )}

        {/* New / Edit task */}
        {modal && (
          <TaskFormModal
            open
            onOpenChange={(o) => !o && setModal(null)}
            mode={modal.mode}
            initial={modal.mode === "edit" ? modal.task : undefined}
            initialValues={
              modal.mode === "edit" ? taskToValues(modal.task) : emptyTaskValues(modal.status)
            }
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </TaskMembersProvider>
  );
}
