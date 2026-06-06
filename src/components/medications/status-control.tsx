"use client";

import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  CircleSlash2,
  Clock,
  MoreHorizontal,
  TimerReset,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Dose, GivenBy } from "./types";

export interface StatusControlProps {
  dose: Dose;
  canRecord: boolean;
  justGiven: boolean;
  onMarkGiven: (via: GivenBy) => void;
  onRequestOutcome: (kind: "skipped" | "refused") => void;
  onUndo: () => void;
  onSnooze: () => void;
  onLogLate: () => void;
}

/** The right-hand status affordance for a single dose: its look + actions depend on dose.status. */
export function StatusControl({
  dose,
  canRecord,
  justGiven,
  onMarkGiven,
  onRequestOutcome,
  onUndo,
  onSnooze,
  onLogLate,
}: StatusControlProps) {
  // GIVEN — success state
  if (dose.status === "given") {
    return (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success",
            justGiven && "motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="whitespace-nowrap">
            Given {dose.givenAt}
            {dose.givenByName ? ` by ${dose.givenByName}` : ""}
          </span>
        </span>
        {canRecord && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={onUndo}>
            <Undo2 className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Undo</span>
          </Button>
        )}
      </div>
    );
  }

  // SKIPPED / REFUSED — resolved, neutral
  if (dose.status === "skipped" || dose.status === "refused") {
    const isRefused = dose.status === "refused";
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {isRefused ? <Ban className="h-3.5 w-3.5" /> : <CircleSlash2 className="h-3.5 w-3.5" />}
          {isRefused ? "Refused" : "Skipped"}
        </span>
        {canRecord && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={onUndo}>
            <Undo2 className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Undo</span>
          </Button>
        )}
      </div>
    );
  }

  // MISSED — calm red + log late
  if (dose.status === "missed") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Missed
        </span>
        {canRecord && (
          <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={onLogLate}>
            <Clock className="h-3.5 w-3.5" />
            <span className="ml-1">Log late</span>
          </Button>
        )}
      </div>
    );
  }

  // UPCOMING — read-only members just see when it's due
  if (!canRecord) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Due {dose.time}
      </span>
    );
  }

  // UPCOMING — primary action + overflow menu
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" className="h-9 shrink-0" onClick={() => onMarkGiven("caregiver")}>
        <Check className="h-4 w-4" />
        <span className="ml-1 whitespace-nowrap">Mark given</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="More dose options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Record this dose</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onMarkGiven("patient")}>
            <Check className="mr-2 h-4 w-4 text-success" />
            Taken by patient
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRequestOutcome("skipped")}>
            <CircleSlash2 className="mr-2 h-4 w-4" />
            Skipped
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRequestOutcome("refused")}>
            <Ban className="mr-2 h-4 w-4" />
            Refused
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSnooze}>
            <TimerReset className="mr-2 h-4 w-4" />
            Snooze 15 min
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
