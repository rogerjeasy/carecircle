"use client";

import * as React from "react";
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
import { categoryMeta, STATUS_COLUMNS } from "./data";
import { dueLabel, isOverdue, memberById } from "./utils";
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
  const cat = categoryMeta[task.category];
  const CatIcon = cat.icon;
  const assignee = memberById(task.assigneeId);
  const done = task.status === "done";
  const overdue = isOverdue(task, now);

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
          aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
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
            <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7 shrink-0" aria-label={`Options for ${task.title}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {STATUS_COLUMNS.map((col) => (
              <DropdownMenuItem
                key={col.id}
                disabled={!canManage || col.id === task.status}
                onClick={() => onMove(col.id)}
              >
                {col.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!canManage} onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canManage}
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Meta row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-7">
        <Badge variant="outline" className={cn("gap-1 border-transparent", cat.tint)}>
          <CatIcon className="h-3 w-3" aria-hidden="true" />
          {cat.label}
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
            {overdue ? `Overdue · ${dueLabel(task.due)}` : dueLabel(task.due)}
          </span>
        )}

        {task.recurrence !== "none" && (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title={`Repeats ${task.recurrence}`}
          >
            <Repeat2 className="h-3 w-3" aria-hidden="true" />
            <span className="capitalize">{task.recurrence}</span>
          </span>
        )}

        <span className="ml-auto">
          <MemberAvatar member={assignee} />
        </span>
      </div>
    </div>
  );
}
