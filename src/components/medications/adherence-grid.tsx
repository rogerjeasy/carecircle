"use client";

import * as React from "react";
import { addDays, format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Cell = "given" | "missed" | "upcoming";

// Deterministic demo week (oldest → today). Each inner array is that day's doses.
const WEEK_PATTERN: Cell[][] = [
  ["given", "given", "given", "given"],
  ["given", "given", "missed", "given"],
  ["given", "given", "given", "given"],
  ["given", "missed", "given", "given"],
  ["given", "given", "given", "given"],
  ["given", "given", "given", "missed"],
  ["given", "given", "upcoming", "upcoming"],
];

const cellStyle: Record<Cell, string> = {
  given: "bg-success",
  missed: "bg-destructive",
  upcoming: "bg-transparent ring-1 ring-inset ring-muted-foreground/30",
};

const cellWord: Record<Cell, string> = { given: "given", missed: "missed", upcoming: "upcoming" };

/** Weekly adherence mini-view: 7 day columns, each a stack of given/missed dots. */
export function AdherenceGrid() {
  const today = new Date();
  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const flat = WEEK_PATTERN.flat();
  const given = flat.filter((c) => c === "given").length;
  const missed = flat.filter((c) => c === "missed").length;
  const denom = given + missed;
  const adherence = denom ? Math.round((given / denom) * 100) : 100;

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">This week&apos;s adherence</h3>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-success tabular-nums">{given}</span> given ·{" "}
              <span className="font-medium text-destructive tabular-nums">{missed}</span> missed
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums leading-none">{adherence}%</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">on time</p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, i) => {
            const cells = WEEK_PATTERN[i];
            const isCurrent = isToday(day);
            return (
              <div key={i} className="flex min-w-0 flex-col items-center gap-1.5">
                <div className="text-center">
                  <p
                    className={cn(
                      "text-[10px] font-medium uppercase",
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {format(day, "EEEEE")}
                  </p>
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      isCurrent ? "font-bold text-primary" : "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-lg py-1.5",
                    isCurrent && "bg-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  {cells.map((cell, j) => (
                    <span
                      key={j}
                      className={cn("h-2.5 w-2.5 rounded-full", cellStyle[cell])}
                      title={`${format(day, "EEE")} dose ${j + 1} — ${cellWord[cell]}`}
                      aria-label={`${format(day, "EEEE")} dose ${j + 1}: ${cellWord[cell]}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden="true" /> Given
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" /> Missed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-muted-foreground/30"
              aria-hidden="true"
            />{" "}
            Upcoming
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
