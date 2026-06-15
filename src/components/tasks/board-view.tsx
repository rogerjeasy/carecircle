"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "./task-card";
import { GatedControl } from "./gated-control";
import { useIsPhone } from "./use-is-phone";
import { STATUS_COLUMN_IDS } from "./data";
import { tasksInColumn } from "./utils";
import type { Task, TaskStatus } from "./types";

export interface BoardViewProps {
  tasks: Task[];
  now: Date;
  canManage: boolean;
  onToggleDone: (id: string) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddInColumn: (status: TaskStatus) => void;
}

/**
 * The board. Three columns side-by-side on laptop/desktop and iPad landscape; on narrower tablets
 * the columns keep a comfortable min width and the *board* (not the page) scrolls horizontally; on
 * phone it collapses to status tabs. Drag-and-drop moves cards between columns, with the card's
 * "Move to" menu as the keyboard / non-pointer fallback.
 */
export function BoardView(props: BoardViewProps) {
  const isPhone = useIsPhone();
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<TaskStatus | null>(null);

  const dnd = {
    draggingId,
    setDraggingId,
    overCol,
    setOverCol,
    onMoveTask: props.onMoveTask,
    canManage: props.canManage,
  };

  if (isPhone) return <PhoneBoard {...props} />;

  return (
    <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
      <div className="grid grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-4">
        {STATUS_COLUMN_IDS.map((id) => (
          <Column key={id} status={id} {...props} dnd={dnd} />
        ))}
      </div>
    </div>
  );
}

interface DndState {
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  overCol: TaskStatus | null;
  setOverCol: (s: TaskStatus | null) => void;
  onMoveTask: (id: string, status: TaskStatus) => void;
  canManage: boolean;
}

function Column({
  status,
  tasks,
  now,
  canManage,
  onToggleDone,
  onMoveTask,
  onEditTask,
  onDeleteTask,
  onAddInColumn,
  dnd,
}: BoardViewProps & { status: TaskStatus; dnd: DndState }) {
  const t = useTranslations("tasks");
  const label = t(`columns.${status}.label` as "columns.open.label");
  const hint = t(`columns.${status}.hint` as "columns.open.hint");
  const items = tasksInColumn(tasks, status);
  const isOver = dnd.overCol === status && dnd.draggingId !== null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dnd.draggingId;
    if (id) onMoveTask(id, status);
    dnd.setDraggingId(null);
    dnd.setOverCol(null);
  };

  return (
    <section
      aria-label={t("board.columnLabel", { label })}
      className={cn(
        "flex max-h-[72dvh] min-h-[14rem] flex-col rounded-2xl border bg-muted/30 transition-colors",
        isOver && dnd.canManage && "border-primary/60 bg-primary/5 ring-1 ring-primary/40"
      )}
      onDragOver={(e) => {
        if (!dnd.canManage || !dnd.draggingId) return;
        e.preventDefault();
        dnd.setOverCol(status);
      }}
      onDrop={dnd.canManage ? handleDrop : undefined}
    >
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="tabular-nums">
          {items.length}
        </Badge>
        <span className="ml-auto" />
        <GatedControl canManage={canManage}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAddInColumn(status)}
            aria-label={t("board.addTaskTo", { label })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </GatedControl>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{hint}</p>
            <p className="text-xs text-muted-foreground/70">
              {dnd.canManage ? t("board.dragHint") : t("board.emptyHint")}
            </p>
          </div>
        ) : (
          items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              now={now}
              canManage={canManage}
              onToggleDone={() => onToggleDone(task.id)}
              onMove={(s) => onMoveTask(task.id, s)}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              dragging={dnd.draggingId === task.id}
              draggableProps={{
                draggable: canManage,
                onDragStart: (e) => {
                  e.dataTransfer.setData("text/plain", task.id);
                  e.dataTransfer.effectAllowed = "move";
                  dnd.setDraggingId(task.id);
                },
                onDragEnd: () => {
                  dnd.setDraggingId(null);
                  dnd.setOverCol(null);
                },
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}

/** Phone: the board collapses to status tabs with a single comfortable column. */
function PhoneBoard({
  tasks,
  now,
  canManage,
  onToggleDone,
  onMoveTask,
  onEditTask,
  onDeleteTask,
  onAddInColumn,
}: BoardViewProps) {
  const t = useTranslations("tasks");
  const [tab, setTab] = React.useState<TaskStatus>("open");
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as TaskStatus)}>
      <TabsList className="w-full">
        {STATUS_COLUMN_IDS.map((id) => {
          const count = tasksInColumn(tasks, id).length;
          return (
            <TabsTrigger key={id} value={id} className="flex-1 gap-1.5">
              {t(`columns.${id}.label` as "columns.open.label")}
              <Badge variant="secondary" className="tabular-nums">
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {STATUS_COLUMN_IDS.map((id) => {
        const items = tasksInColumn(tasks, id);
        const label = t(`columns.${id}.label` as "columns.open.label");
        return (
          <TabsContent key={id} value={id} className="space-y-2">
            {canManage && (
              <Button variant="outline" className="w-full" onClick={() => onAddInColumn(id)}>
                <Plus className="h-4 w-4" />
                <span className="ml-1">{t("board.addToColumn", { label })}</span>
              </Button>
            )}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">{t(`columns.${id}.hint` as "columns.open.hint")}</p>
                <p className="text-xs text-muted-foreground/70">{t("board.emptyHint")}</p>
              </div>
            ) : (
              items.map((task) => (
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
              ))
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
