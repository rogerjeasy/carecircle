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
import { BoardSkeleton, ListSkeleton } from "./task-skeletons";
import { GatedControl } from "./gated-control";
import { buildTasks } from "./data";
import { canManageTasks } from "./utils";
import { emptyTaskValues, type TaskFormValues } from "./schema";
import { taskToValues, valuesToTask } from "./mapping";
import type { Task, TaskStatus } from "./types";

type ModalState =
  | { mode: "add"; status: TaskStatus }
  | { mode: "edit"; task: Task }
  | null;

/** The Tasks screen: Board / List toggle, filters, fair-share, and a new-task form. */
export function TasksScreen() {
  const { role } = useAppShell();
  const canManage = canManageTasks(role);

  const [now] = React.useState(() => new Date());
  const [tasks, setTasks] = React.useState<Task[]>(() => buildTasks(now));
  const [view, setView] = React.useState<"board" | "list">("board");
  const [filters, setFilters] = React.useState<TaskFilters>(DEFAULT_FILTERS);
  const [modal, setModal] = React.useState<ModalState>(null);
  const [loading, setLoading] = React.useState(true);
  const newIdRef = React.useRef(1);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

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

  const moveTask = (id: string, status: TaskStatus) => {
    setTasks((prev) => {
      const order = prev.filter((t) => t.status === status).reduce((m, t) => Math.max(m, t.order), -1) + 1;
      return prev.map((t) => (t.id === id ? { ...t, status, order } : t));
    });
  };

  const toggleDone = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    moveTask(id, task.status === "done" ? "open" : "done");
  };

  const deleteTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast(`${task?.title ?? "Task"} deleted`);
  };

  const handleSubmit = (values: TaskFormValues) => {
    if (modal?.mode === "edit") {
      const updated = valuesToTask(values, modal.task.id, modal.task.order, modal.task);
      setTasks((prev) => prev.map((t) => (t.id === modal.task.id ? updated : t)));
      toast.success(`${updated.title} updated`);
    } else {
      const id = `task-new-${newIdRef.current++}`;
      const created = valuesToTask(values, id, nextOrder(values.status));
      setTasks((prev) => [created, ...prev]);
      toast.success(`${created.title} added`);
    }
    setModal(null);
  };

  const openAdd = (status: TaskStatus = "open") => setModal({ mode: "add", status });

  return (
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
      {loading ? (
        view === "board" ? (
          <BoardSkeleton />
        ) : (
          <ListSkeleton />
        )
      ) : view === "board" ? (
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
  );
}
