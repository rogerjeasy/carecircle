"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, CalendarDays, GripVertical, MoreVertical, Pencil, Repeat2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberAvatar } from "./member-avatar";
import { categoryMeta, STATUS_COLUMN_IDS } from "./data";
import { useTaskMembers } from "./members-context";
import { dueLabel, isOverdue } from "./utils";
import type { Task, TaskStatus } from "./types";

export interface TaskCardProps {
  task: Task;
  now: Date;
  canManage: boolean;
  onToggleDone: () => void;
  onMove: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** DnD wiring (board only); omitted in list view. */
  draggableProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
  dragging?: boolean;
}

/** A task card: complete checkbox, title, category tag, due date, assignee, and a move/edit menu. */
export function TaskCard({
  task,
  now,
  canManage,
  onToggleDone,
  onMove,
  onEdit,
  onDelete,
  draggableProps,
  dragging,
}: TaskCardProps) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const { byId } = useTaskMembers();
  const cat = categoryMeta[task.category];
  const CatIcon = cat.icon;
  const assignee = byId(task.assigneeId);
  const done = task.status === "done";
  const overdue = isOverdue(task, now);
  const relLabels = {
    today: t("relative.today"),
    tomorrow: t("relative.tomorrow"),
    yesterday: t("relative.yesterday"),
  };
  const recurrenceLabel = t(`recurrence.${task.recurrence}` as "recurrence.none");

  return (
    <div
      {...draggableProps}
      className={cn(
        "group rounded-xl border bg-card p-3 shadow-sm transition-shadow motion-safe:transition-all",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
        canManage && draggableProps?.draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50 motion-safe:scale-[0.98]"
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={done}
          onCheckedChange={onToggleDone}
          disabled={!canManage}
          aria-label={done ? t("card.markNotDone", { title: task.title }) : t("card.markDone", { title: task.title })}
          className="mt-0.5"
        />
        <button
          type="button"
          onClick={onEdit}
          className="min-w-0 flex-1 text-left focus:outline-none"
        >
          <p
            className={cn(
              "break-words text-sm font-medium leading-snug",
              done && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </p>
        </button>

        {canManage && draggableProps?.draggable && (
          <GripVertical
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground"
            aria-hidden="true"
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7 shrink-0" aria-label={t("card.options", { title: task.title })}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>{t("card.moveTo")}</DropdownMenuLabel>
            {STATUS_COLUMN_IDS.map((id) => (
              <DropdownMenuItem
                key={id}
                disabled={!canManage || id === task.status}
                onClick={() => onMove(id)}
              >
                {t(`columns.${id}.label` as "columns.open.label")}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!canManage} onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("card.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canManage}
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("card.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Meta row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-7">
        <Badge variant="outline" className={cn("gap-1 border-transparent", cat.tint)}>
          <CatIcon className="h-3 w-3" aria-hidden="true" />
          {t(`categories.${task.category}` as "categories.errand")}
        </Badge>

        {task.due && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs tabular-nums",
              overdue ? "font-medium text-destructive" : "text-muted-foreground"
            )}
          >
            {overdue ? (
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
            ) : (
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
            )}
            {overdue
              ? t("card.overdue", { date: dueLabel(locale, task.due, relLabels) })
              : dueLabel(locale, task.due, relLabels)}
          </span>
        )}

        {task.recurrence !== "none" && (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title={t("card.repeats", { recurrence: recurrenceLabel })}
          >
            <Repeat2 className="h-3 w-3" aria-hidden="true" />
            <span>{recurrenceLabel}</span>
          </span>
        )}

        <span className="ml-auto">
          <MemberAvatar member={assignee} />
        </span>
      </div>
    </div>
  );
}
