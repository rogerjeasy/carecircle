"use client";

import { Pill, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PrnMed } from "./types";

export interface PrnRowProps {
  prn: PrnMed;
  canRecord: boolean;
  onLog: () => void;
}

/** A single "as needed" (PRN) medication with a per-day usage counter and a "Log dose" action. */
export function PrnRow({ prn, canRecord, onLog }: PrnRowProps) {
  const t = useTranslations("medications");
  const atLimit = prn.takenToday >= prn.maxPerDay;
  return (
    <li className="rounded-xl border bg-card p-3 sm:p-3.5">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent sm:h-11 sm:w-11">
          <Pill className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">
                {prn.name} <span className="font-normal text-muted-foreground">{prn.strength}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {prn.purpose}
                {prn.lastTaken ? ` · ${t("prn.last", { time: prn.lastTaken })}` : ""}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs tabular-nums text-muted-foreground">
                {t("prn.todayCount", { taken: prn.takenToday, max: prn.maxPerDay })}
              </span>
              {canRecord && (
                <Button
                  variant={atLimit ? "outline" : "secondary"}
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={onLog}
                  disabled={atLimit}
                >
                  <Plus className="h-4 w-4" />
                  <span className="ml-1 whitespace-nowrap">{atLimit ? t("prn.maxReached") : t("prn.logDose")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
