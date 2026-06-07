"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { AdherenceSummary } from "./types";

type Cell = "given" | "missed" | "upcoming";

const cellStyle: Record<Cell, string> = {
  given: "bg-success",
  missed: "bg-destructive",
  upcoming: "bg-transparent ring-1 ring-inset ring-muted-foreground/30",
};

const cellWord: Record<Cell, string> = { given: "given", missed: "missed", upcoming: "upcoming" };

export interface AdherenceGridProps {
  /** Real weekly adherence, computed server-side. Null/empty → a calm "nothing yet" state. */
  summary: AdherenceSummary | null;
}

/** Weekly adherence mini-view: 7 day columns, each a stack of given/missed dots, from real data. */
export function AdherenceGrid({ summary }: AdherenceGridProps) {
  const days = summary?.days ?? [];
  const given = summary?.given ?? 0;
  const missed = summary?.missed ?? 0;
  const denom = given + missed;
  const adherence = denom ? Math.round((given / denom) * 100) : null;
  const hasData = denom > 0;

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
            <p className="text-lg font-bold tabular-nums leading-none">
              {adherence === null ? "—" : `${adherence}%`}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">on time</p>
          </div>
        </div>

        {days.length > 0 ? (
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day) => {
              const date = parseISO(day.date);
              const isCurrent = format(new Date(), "yyyy-MM-dd") === day.date;
              return (
                <div key={day.date} className="flex min-w-0 flex-col items-center gap-1.5">
                  <div className="text-center">
                    <p
                      className={cn(
                        "text-[10px] font-medium uppercase",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {format(date, "EEEEE")}
                    </p>
                    <p
                      className={cn(
                        "text-xs tabular-nums",
                        isCurrent ? "font-bold text-primary" : "text-muted-foreground"
                      )}
                    >
                      {format(date, "d")}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex w-full flex-col items-center gap-1 rounded-lg py-1.5",
                      isCurrent && "bg-primary/5 ring-1 ring-primary/20"
                    )}
                  >
                    {day.cells.length === 0 ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                    ) : (
                      day.cells.map((cell, j) => (
                        <span
                          key={j}
                          className={cn("h-2.5 w-2.5 rounded-full", cellStyle[cell])}
                          title={`${format(date, "EEE")} dose ${j + 1} — ${cellWord[cell]}`}
                          aria-label={`${format(date, "EEEE")} dose ${j + 1}: ${cellWord[cell]}`}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Adherence will appear here as doses are recorded.
          </p>
        )}

        {!hasData && days.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">No doses recorded in the last 7 days yet.</p>
        )}

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
