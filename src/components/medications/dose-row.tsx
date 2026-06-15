"use client";

import { AlertTriangle, Clock, Pill, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GatedControl } from "./gated-control";
import { StatusControl } from "./status-control";
import { LOW_SUPPLY_THRESHOLD } from "./data";
import type { Dose, GivenBy, Medication } from "./types";

export interface DoseRowProps {
  dose: Dose;
  med?: Medication;
  canRecord: boolean;
  canManage: boolean;
  justGiven: boolean;
  onMarkGiven: (via: GivenBy) => void;
  onRequestOutcome: (kind: "skipped" | "refused") => void;
  onUndo: () => void;
  onSnooze: () => void;
  onLogLate: () => void;
  onCreateRefill: () => void;
}

/**
 * A single scheduled dose. On phone the meta (time + status) wraps to a second line; from `sm`
 * up everything sits on one comfortable row. Long med names truncate (min-w-0) so the row never
 * forces horizontal overflow.
 */
export function DoseRow({
  dose,
  med,
  canRecord,
  canManage,
  justGiven,
  onMarkGiven,
  onRequestOutcome,
  onUndo,
  onSnooze,
  onLogLate,
  onCreateRefill,
}: DoseRowProps) {
  const t = useTranslations("medications");
  const isLow = med ? med.supplyDays <= LOW_SUPPLY_THRESHOLD : false;
  const given = dose.status === "given";

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-3 transition-colors sm:p-3.5",
        justGiven && "motion-safe:animate-in motion-safe:fade-in ring-1 ring-success/40"
      )}
    >
      <div className="flex items-start gap-3 sm:items-center">
        {/* Pill icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11",
            given ? "bg-success/10 text-success" : "bg-secondary text-primary"
          )}
        >
          <Pill className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {/* Name + purpose */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">
                {dose.name} <span className="font-normal text-muted-foreground">{dose.strength}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">{dose.purpose}</p>
            </div>

            {/* Time + status: own line on phone, inline at the end from sm up */}
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="inline-flex items-center gap-1 text-sm tabular-nums text-muted-foreground sm:order-first">
                <Clock className="h-3.5 w-3.5 sm:hidden" aria-hidden="true" />
                {dose.time}
              </span>
              <StatusControl
                dose={dose}
                canRecord={canRecord}
                justGiven={justGiven}
                onMarkGiven={onMarkGiven}
                onRequestOutcome={onRequestOutcome}
                onUndo={onUndo}
                onSnooze={onSnooze}
                onLogLate={onLogLate}
              />
            </div>
          </div>

          {/* Low-supply inline alert */}
          {isLow && med && (
            <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex min-w-0 items-center gap-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 tabular-nums">{t("doseRow.daysLeft", { days: med.supplyDays })}</span>
              </p>
              <GatedControl canManage={canManage}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 self-start sm:self-auto"
                  onClick={onCreateRefill}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="ml-1">{t("refill.create")}</span>
                </Button>
              </GatedControl>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
