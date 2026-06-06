"use client";

import { CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./task-card";
import { STATUS_COLUMNS } from "./data";
import { tasksInColumn } from "./utils";
import type { Task, TaskStatus } from "./types";

export interface ListViewProps {
  tasks: Task[];
  now: Date;
  canManage: boolean;
  onToggleDone: (id: string) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

/** The List view: the same tasks grouped by status in a comfortable responsive grid. */
export function ListView({
  tasks,
  now,
  canManage,
  onToggleDone,
  onMoveTask,
  onEditTask,
  onDeleteTask,
}: ListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
          <CheckSquare className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold">No tasks match these filters</p>
        <p className="text-sm text-muted-foreground">Try clearing a filter, or add a new task.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {STATUS_COLUMNS.map((col) => {
        const items = tasksInColumn(tasks, col.id);
        if (items.length === 0) return null;
        return (
          <section key={col.id} aria-label={col.label}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold">{col.label}</h2>
              <Badge variant="secondary" className="tabular-nums">
                {items.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  now={now}
                  canManage={canManage}
                  onToggleDone={() => onToggleDone(task.id)}
                  onMove={(s) => onMoveTask(task.id, s)}
                  onEdit={() => onEditTask(task)}
                  onDelete={() => onDeleteTask(task.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
