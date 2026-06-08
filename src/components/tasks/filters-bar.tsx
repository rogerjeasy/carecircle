"use client";

import { ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_OPTIONS, STATUS_COLUMNS } from "./data";
import { useTaskMembers } from "./members-context";
import { firstName } from "./utils";
import type { TaskCategory, TaskStatus } from "./types";

export interface TaskFilters {
  assignee: string; // member id | "all" | "unassigned"
  category: TaskCategory | "all";
  status: TaskStatus | "all";
}

export const DEFAULT_FILTERS: TaskFilters = { assignee: "all", category: "all", status: "all" };

export function isFiltering(f: TaskFilters): boolean {
  return f.assignee !== "all" || f.category !== "all" || f.status !== "all";
}

/** The filter row: assignee / category / status selects, with a Clear shortcut when active. */
export function FiltersBar({
  filters,
  onChange,
}: {
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
}) {
  const { members } = useTaskMembers();
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <ListFilter className="h-4 w-4" aria-hidden="true" />
        Filter
      </span>

      <Select value={filters.assignee} onValueChange={(v) => set({ assignee: v })}>
        <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by assignee">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {firstName(m.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(v) => set({ category: v as TaskFilters["category"] })}>
        <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filter by category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORY_OPTIONS.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => set({ status: v as TaskFilters["status"] })}>
        <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any status</SelectItem>
          {STATUS_COLUMNS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltering(filters) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 self-start text-muted-foreground sm:self-auto"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          <X className="h-4 w-4" />
          <span className="ml-1">Clear</span>
        </Button>
      )}
    </div>
  );
}
