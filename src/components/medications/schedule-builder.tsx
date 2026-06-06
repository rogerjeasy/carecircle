"use client";

import { Clock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  EVERY_DAY,
  WEEKDAYS,
  WEEKDAYS_ONLY,
  type MedFormErrors,
  type ScheduleRow,
} from "./schema";

export interface ScheduleBuilderProps {
  isPrn: boolean;
  onPrnChange: (value: boolean) => void;
  schedules: ScheduleRow[];
  onChange: (rows: ScheduleRow[]) => void;
  errors: MedFormErrors;
  /** Stable id factory for new rows (kept out of render to stay deterministic). */
  makeId: () => string;
}

/**
 * Repeatable schedule rows (time + days of week) plus a PRN ("as needed") toggle. Rows stay on a
 * single line from `sm` up; on phone they wrap to keep the day toggles tappable.
 */
export function ScheduleBuilder({
  isPrn,
  onPrnChange,
  schedules,
  onChange,
  errors,
  makeId,
}: ScheduleBuilderProps) {
  const updateRow = (id: string, patch: Partial<ScheduleRow>) =>
    onChange(schedules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const toggleDay = (id: string, day: number) => {
    const row = schedules.find((r) => r.id === id);
    if (!row) return;
    const days = row.days.includes(day)
      ? row.days.filter((d) => d !== day)
      : [...row.days, day].sort((a, b) => a - b);
    updateRow(id, { days });
  };

  const addRow = () => onChange([...schedules, { id: makeId(), time: "08:00", days: [...EVERY_DAY] }]);
  const removeRow = (id: string) => onChange(schedules.filter((r) => r.id !== id));

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3 sm:p-4">
      {/* PRN toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Taken as needed (PRN)</p>
          <p className="text-xs text-muted-foreground">No fixed schedule — given only when required.</p>
        </div>
        <Switch checked={isPrn} onCheckedChange={onPrnChange} aria-label="Taken as needed" />
      </div>

      {!isPrn && (
        <div className="space-y-3">
          <div className="h-px bg-border" />

          {errors["schedules"] && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {errors["schedules"]}
            </p>
          )}

          {schedules.map((row, i) => {
            const timeError = errors[`schedules.${i}.time`];
            const daysError = errors[`schedules.${i}.days`];
            return (
              <div key={row.id} className="rounded-lg border bg-card p-2.5">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                  {/* Time */}
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <Input
                      type="time"
                      value={row.time}
                      aria-label={`Dose ${i + 1} time`}
                      aria-invalid={timeError ? true : undefined}
                      onChange={(e) => updateRow(row.id, { time: e.target.value })}
                      className={cn("h-9 w-[8.5rem]", timeError && "border-destructive")}
                    />
                  </div>

                  {/* Day toggles */}
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const on = row.days.includes(d.index);
                      return (
                        <button
                          key={d.index}
                          type="button"
                          aria-pressed={on}
                          aria-label={d.full}
                          title={d.full}
                          onClick={() => toggleDay(row.id, d.index)}
                          className={cn(
                            "h-8 w-8 shrink-0 rounded-full text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                            on
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/70"
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Remove */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 self-end text-muted-foreground hover:text-destructive sm:self-auto"
                    onClick={() => removeRow(row.id)}
                    disabled={schedules.length === 1}
                    aria-label={`Remove dose ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Per-row presets + day error */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 sm:pl-0">
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { days: [...EVERY_DAY] })}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Every day
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { days: [...WEEKDAYS_ONLY] })}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Weekdays
                  </button>
                  {daysError && (
                    <span className="text-xs font-medium text-destructive" role="alert">
                      {daysError}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="ml-1">Add another time</span>
          </Button>
        </div>
      )}
    </div>
  );
}
