"use client";

import * as React from "react";
import { addDays, format, isToday, isTomorrow, isYesterday } from "date-fns";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DoseRow } from "./dose-row";
import { PrnRow } from "./prn-row";
import { AdherenceGrid } from "./adherence-grid";
import { initialDoses, initialPrn, PERIOD_ORDER, periodMeta } from "./data";
import { nowTimeLabel } from "./utils";
import type { Dose, GivenBy, Medication, Period, PrnMed } from "./types";

export interface TodayTabProps {
  meds: Medication[];
  canRecord: boolean;
  canManage: boolean;
  userName: string;
}

/** The "Today" tab: date stepper, progress header, doses grouped by time of day, and PRN meds. */
export function TodayTab({ meds, canRecord, canManage, userName }: TodayTabProps) {
  const [doses, setDoses] = React.useState<Dose[]>(initialDoses);
  const [prn, setPrn] = React.useState<PrnMed[]>(initialPrn);
  const [dayOffset, setDayOffset] = React.useState(0);
  const [justGivenId, setJustGivenId] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{ doseId: string; kind: "skipped" | "refused" } | null>(null);
  const givenTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const medsById = React.useMemo(() => {
    const map = new Map<string, Medication>();
    meds.forEach((m) => map.set(m.id, m));
    return map;
  }, [meds]);

  const viewedDate = addDays(new Date(), dayOffset);
  const dateLabel = isToday(viewedDate)
    ? "Today"
    : isYesterday(viewedDate)
      ? "Yesterday"
      : isTomorrow(viewedDate)
        ? "Tomorrow"
        : format(viewedDate, "EEE, MMM d");

  const givenCount = doses.filter((d) => d.status === "given").length;
  const totalCount = doses.length;
  const progressPct = totalCount ? (givenCount / totalCount) * 100 : 0;

  const flashGiven = React.useCallback((id: string) => {
    setJustGivenId(id);
    if (givenTimer.current) clearTimeout(givenTimer.current);
    givenTimer.current = setTimeout(() => setJustGivenId(null), 2600);
  }, []);

  React.useEffect(
    () => () => {
      if (givenTimer.current) clearTimeout(givenTimer.current);
    },
    []
  );

  const markGiven = (dose: Dose, via: GivenBy) => {
    // Optimistic update with a soft success cue.
    setDoses((prev) =>
      prev.map((d) =>
        d.id === dose.id
          ? {
              ...d,
              status: "given",
              givenAt: nowTimeLabel(),
              givenByName: via === "patient" ? "patient" : userName,
              givenVia: via,
            }
          : d
      )
    );
    flashGiven(dose.id);
    toast.success(`${dose.name} ${dose.strength} marked given`, {
      description: via === "patient" ? "Recorded as taken by the patient" : `Recorded by ${userName}`,
    });
  };

  const setOutcome = (doseId: string, kind: "skipped" | "refused") => {
    setDoses((prev) => prev.map((d) => (d.id === doseId ? { ...d, status: kind } : d)));
    const d = doses.find((x) => x.id === doseId);
    toast(`${d?.name ?? "Dose"} marked ${kind}`);
  };

  const undo = (doseId: string) => {
    setDoses((prev) =>
      prev.map((d) =>
        d.id === doseId
          ? { ...d, status: "upcoming", givenAt: undefined, givenByName: undefined, givenVia: undefined }
          : d
      )
    );
  };

  const snooze = (dose: Dose) => toast(`${dose.name} snoozed 15 minutes`);

  const logLate = (dose: Dose) => {
    setDoses((prev) =>
      prev.map((d) =>
        d.id === dose.id
          ? { ...d, status: "given", givenAt: nowTimeLabel(), givenByName: userName, givenVia: "caregiver" }
          : d
      )
    );
    flashGiven(dose.id);
    toast.success(`${dose.name} logged as given (late)`);
  };

  const logPrn = (prnId: string) => {
    setPrn((prev) =>
      prev.map((p) =>
        p.id === prnId && p.takenToday < p.maxPerDay
          ? { ...p, takenToday: p.takenToday + 1, lastTaken: nowTimeLabel() }
          : p
      )
    );
    const p = prn.find((x) => x.id === prnId);
    toast.success(`${p?.name ?? "PRN"} dose logged`);
  };

  const createRefill = (medName: string) =>
    toast.success("Refill task created", { description: `Reorder ${medName} added to Tasks` });

  const dosesByPeriod = React.useMemo(() => {
    const groups: Record<Period, Dose[]> = { Morning: [], Afternoon: [], Evening: [], Night: [] };
    doses.forEach((d) => groups[d.period].push(d));
    return groups;
  }, [doses]);

  const isViewingToday = dayOffset === 0;

  return (
    <div className="space-y-5">
      {/* Date stepper + progress header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setDayOffset((o) => o - 1)}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 text-center">
              <p className="truncate text-base font-semibold">{dateLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{format(viewedDate, "EEEE, MMMM d")}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setDayOffset((o) => o + 1)}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isViewingToday && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  <span className="tabular-nums">{givenCount}</span> of{" "}
                  <span className="tabular-nums">{totalCount}</span> doses given today
                </p>
                <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
                  {Math.round(progressPct)}%
                </Badge>
              </div>
              <Progress value={progressPct} aria-label={`${givenCount} of ${totalCount} doses given`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly adherence mini-view */}
      <AdherenceGrid />

      {!isViewingToday ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">No schedule loaded for {dateLabel.toLowerCase()}</p>
              <p className="mt-1 text-sm text-muted-foreground">Switch back to today to record doses.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDayOffset(0)}>
              Back to today
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scheduled doses grouped by period */}
          <div className="space-y-5">
            {PERIOD_ORDER.map((period) => {
              const list = dosesByPeriod[period];
              if (list.length === 0) return null;
              const Icon = periodMeta[period].icon;
              const periodGiven = list.filter((d) => d.status === "given").length;
              return (
                <section key={period} aria-label={period}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <Icon className={cn("h-4 w-4", periodMeta[period].tint)} aria-hidden="true" />
                    <h3 className="text-sm font-semibold">{period}</h3>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {periodGiven}/{list.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {list.map((dose) => (
                      <DoseRow
                        key={dose.id}
                        dose={dose}
                        med={medsById.get(dose.medId)}
                        canRecord={canRecord}
                        canManage={canManage}
                        justGiven={justGivenId === dose.id}
                        onMarkGiven={(via) => markGiven(dose, via)}
                        onRequestOutcome={(kind) => setConfirm({ doseId: dose.id, kind })}
                        onUndo={() => undo(dose.id)}
                        onSnooze={() => snooze(dose)}
                        onLogLate={() => logLate(dose)}
                        onCreateRefill={() => createRefill(dose.name)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* PRN */}
          <section aria-label="As needed">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">As needed (PRN)</h3>
            </div>
            <ul className="space-y-2">
              {prn.map((p) => (
                <PrnRow key={p.id} prn={p} canRecord={canRecord} onLog={() => logPrn(p.id)} />
              ))}
            </ul>
          </section>
        </>
      )}

      {/* Confirm skipped/refused */}
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "refused" ? "Mark dose as refused?" : "Mark dose as skipped?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "refused"
                ? "This records that the patient declined the medication. It will be noted in the timeline."
                : "This records that the dose was intentionally not given. It will be noted in the timeline."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) setOutcome(confirm.doseId, confirm.kind);
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
