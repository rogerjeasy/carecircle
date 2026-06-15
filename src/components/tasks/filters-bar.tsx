"use client";

import { useTranslations } from "next-intl";
import { ListFilter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_VALUES, STATUS_COLUMN_IDS } from "./data";
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
  const t = useTranslations("tasks");
  const { members } = useTaskMembers();
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <ListFilter className="h-4 w-4" aria-hidden="true" />
        {t("filters.filter")}
      </span>

      <Select value={filters.assignee} onValueChange={(v) => set({ assignee: v })}>
        <SelectTrigger className="h-9 w-full sm:w-44" aria-label={t("filters.assignee")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.everyone")}</SelectItem>
          <SelectItem value="unassigned">{t("filters.unassigned")}</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {firstName(m.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(v) => set({ category: v as TaskFilters["category"] })}>
        <SelectTrigger className="h-9 w-full sm:w-40" aria-label={t("filters.category")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allCategories")}</SelectItem>
          {CATEGORY_VALUES.map((c) => (
            <SelectItem key={c} value={c}>
              {t(`categories.${c}` as "categories.errand")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => set({ status: v as TaskFilters["status"] })}>
        <SelectTrigger className="h-9 w-full sm:w-36" aria-label={t("filters.status")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.anyStatus")}</SelectItem>
          {STATUS_COLUMN_IDS.map((id) => (
            <SelectItem key={id} value={id}>
              {t(`columns.${id}.label` as "columns.open.label")}
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
          <span className="ml-1">{t("filters.clear")}</span>
        </Button>
      )}
    </div>
  );
}
