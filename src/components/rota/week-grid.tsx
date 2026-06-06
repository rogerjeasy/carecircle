"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShiftBlock } from "./shift-block";
import { GatedControl } from "./gated-control";
import { useIsPhone } from "./use-is-phone";
import { DAY_FULL, DAY_LABELS } from "./data";
import { shiftsForDay } from "./utils";
import type { Shift } from "./types";

export interface WeekGridProps {
  shifts: Shift[];
  now: Date;
  canManage: boolean;
  onAddOnDay: (dayIndex: number) => void;
  onDeleteShift: (id: string) => void;
  /** Shift currently on-call (highlighted), if any. */
  onCallShiftId?: string;
}

/**
 * The week view. The full 7-day grid is kept on tablet/iPad (portrait + landscape), laptop and
 * desktop; if a viewport is ever too narrow for the grid it scrolls inside its own container (never
 * the page). On phone it becomes a day-by-day stacked list.
 */
export function WeekGrid(props: WeekGridProps) {
  const isPhone = useIsPhone();
  return isPhone ? <DayList {...props} /> : <Grid {...props} />;
}

function Grid({ shifts, now, canManage, onAddOnDay, onDeleteShift, onCallShiftId }: WeekGridProps) {
  const weekStart = startOfWeek(now);
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card [scrollbar-width:thin]">
      <div className="grid min-w-[44rem] grid-cols-7 divide-x">
        {DAY_LABELS.map((label, i) => {
          const date = addDays(weekStart, i);
          const today = isSameDay(date, now);
          const dayShifts = shiftsForDay(shifts, i);
          return (
            <div key={i} className={cn("flex min-w-0 flex-col", today && "bg-accent/5")}>
              <div className="flex items-center justify-between gap-1 border-b px-2 py-2">
                <div className="min-w-0">
                  <p className={cn("text-xs font-semibold", today && "text-primary")}>{label}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{format(date, "MMM d")}</p>
                </div>
                {today && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Today
                  </span>
                )}
              </div>
              <div className="flex min-h-[9rem] flex-1 flex-col gap-1.5 p-1.5">
                {dayShifts.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-4 text-center">
                    <span className="text-[11px] text-muted-foreground">No one yet</span>
                  </div>
                ) : (
                  dayShifts.map((s) => (
                    <ShiftBlock
                      key={s.id}
                      shift={s}
                      canManage={canManage}
                      onDelete={() => onDeleteShift(s.id)}
                      highlight={s.id === onCallShiftId}
                    />
                  ))
                )}
                {canManage && (
                  <GatedControl canManage={canManage}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full justify-center text-xs text-muted-foreground"
                      onClick={() => onAddOnDay(i)}
                      aria-label={`Add shift on ${DAY_FULL[i]}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </GatedControl>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayList({ shifts, now, canManage, onAddOnDay, onDeleteShift, onCallShiftId }: WeekGridProps) {
  const weekStart = startOfWeek(now);
  return (
    <div className="space-y-3">
      {DAY_LABELS.map((label, i) => {
        const date = addDays(weekStart, i);
        const today = isSameDay(date, now);
        const dayShifts = shiftsForDay(shifts, i);
        return (
          <section
            key={i}
            aria-label={DAY_FULL[i]}
            className={cn("rounded-2xl border bg-card p-3", today && "ring-1 ring-primary/40")}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-semibold">{DAY_FULL[i]}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">{format(date, "MMM d")}</span>
                {today && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Today
                  </span>
                )}
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onAddOnDay(i)}
                  aria-label={`Add shift on ${DAY_FULL[i]}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            {dayShifts.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
                No one scheduled.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {dayShifts.map((s) => (
                  <ShiftBlock
                    key={s.id}
                    shift={s}
                    canManage={canManage}
                    onDelete={() => onDeleteShift(s.id)}
                    highlight={s.id === onCallShiftId}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
