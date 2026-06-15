"use client";

import * as React from "react";
import { addDays, format, isToday, isTomorrow, isYesterday } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Clock, Plus, Sparkles } from "lucide-react";
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
import { PERIOD_ORDER, periodMeta } from "./data";
import { nowTimeLabel } from "./utils";
import { recordDose, undoDose, logPrn as logPrnAction, createRefillTask } from "@/lib/medications/actions";
import type { AdherenceSummary, Dose, GivenBy, Medication, Period, PrnMed } from "./types";

export interface TodayTabProps {
  meds: Medication[];
  canRecord: boolean;
  canManage: boolean;
  userName: string;
  /** Today's scheduled doses, assembled server-side. */
  initialDoses: Dose[];
  /** Active as-needed (PRN) meds + today's usage. */
  initialPrn: PrnMed[];
  /** Weekly adherence summary, or null when none could be loaded. */
  adherence: AdherenceSummary | null;
  /** Open the (screen-owned) Add medication modal. */
  onAddMedication: () => void;
}

/** The "Today" tab: date stepper, progress header, doses grouped by time of day, and PRN meds. */
export function TodayTab({ meds, canRecord, canManage, userName, initialDoses, initialPrn, adherence, onAddMedication }: TodayTabProps) {
  const t = useTranslations("medications");
  const [doses, setDoses] = React.useState<Dose[]>(initialDoses);
  const [prn, setPrn] = React.useState<PrnMed[]>(initialPrn);
  const [dayOffset, setDayOffset] = React.useState(0);
  const [justGivenId, setJustGivenId] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{ doseId: string; kind: "skipped" | "refused" } | null>(null);
  const givenTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-seed local optimistic state when the server data changes (e.g. after a router.refresh).
  // This is the intended "reset state on prop change" pattern, so the rule below is a false positive.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setDoses(initialDoses), [initialDoses]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setPrn(initialPrn), [initialPrn]);

  const medsById = React.useMemo(() => {
    const map = new Map<string, Medication>();
    meds.forEach((m) => map.set(m.id, m));
    return map;
  }, [meds]);

  const viewedDate = addDays(new Date(), dayOffset);
  const dateLabel = isToday(viewedDate)
    ? t("today.today")
    : isYesterday(viewedDate)
      ? t("today.yesterday")
      : isTomorrow(viewedDate)
        ? t("today.tomorrow")
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

  /** Run a server action with optimistic UI: apply now, revert + toast on failure. */
  const persist = React.useCallback(
    async (
      action: () => Promise<{ ok: boolean; error?: string }>,
      snapshot: { doses: Dose[]; prn: PrnMed[] },
      onError?: () => void
    ) => {
      try {
        const res = await action();
        if (!res.ok) {
          setDoses(snapshot.doses);
          setPrn(snapshot.prn);
          onError?.();
          toast.error(res.error ?? t("toasts.saveRetry"));
        }
      } catch {
        setDoses(snapshot.doses);
        setPrn(snapshot.prn);
        onError?.();
        toast.error(t("toasts.saveRetry"));
      }
    },
    [t]
  );

  const markGiven = (dose: Dose, via: GivenBy) => {
    const snapshot = { doses, prn };
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
    toast.success(t("today.markedGiven", { name: dose.name, strength: dose.strength }), {
      description: via === "patient" ? t("today.recordedPatient") : t("today.recordedBy", { name: userName }),
    });
    if (dose.scheduleId && dose.scheduledForISO) {
      void persist(
        () => recordDose({ medId: dose.medId, scheduleId: dose.scheduleId!, scheduledForISO: dose.scheduledForISO!, outcome: "given", via }),
        snapshot
      );
    }
  };

  const setOutcome = (doseId: string, kind: "skipped" | "refused") => {
    const dose = doses.find((x) => x.id === doseId);
    const snapshot = { doses, prn };
    setDoses((prev) => prev.map((d) => (d.id === doseId ? { ...d, status: kind } : d)));
    const name = dose?.name ?? t("today.doseFallback");
    toast(kind === "refused" ? t("today.markedRefused", { name }) : t("today.markedSkipped", { name }));
    if (dose?.scheduleId && dose.scheduledForISO) {
      void persist(
        () => recordDose({ medId: dose.medId, scheduleId: dose.scheduleId!, scheduledForISO: dose.scheduledForISO!, outcome: kind }),
        snapshot
      );
    }
  };

  const undo = (doseId: string) => {
    const dose = doses.find((x) => x.id === doseId);
    const snapshot = { doses, prn };
    setDoses((prev) =>
      prev.map((d) =>
        d.id === doseId
          ? { ...d, status: "upcoming", givenAt: undefined, givenByName: undefined, givenVia: undefined }
          : d
      )
    );
    if (dose?.scheduleId && dose.scheduledForISO) {
      void persist(() => undoDose({ scheduleId: dose.scheduleId!, scheduledForISO: dose.scheduledForISO! }), snapshot);
    }
  };

  const snooze = (dose: Dose) => toast(t("today.snoozed", { name: dose.name }));

  const logLate = (dose: Dose) => {
    const snapshot = { doses, prn };
    setDoses((prev) =>
      prev.map((d) =>
        d.id === dose.id
          ? { ...d, status: "given", givenAt: nowTimeLabel(), givenByName: userName, givenVia: "caregiver" }
          : d
      )
    );
    flashGiven(dose.id);
    toast.success(t("today.loggedLate", { name: dose.name }));
    if (dose.scheduleId && dose.scheduledForISO) {
      void persist(
        () => recordDose({ medId: dose.medId, scheduleId: dose.scheduleId!, scheduledForISO: dose.scheduledForISO!, outcome: "given", via: "caregiver" }),
        snapshot
      );
    }
  };

  const logPrn = (prnId: string) => {
    const p = prn.find((x) => x.id === prnId);
    if (!p || p.takenToday >= p.maxPerDay) return;
    const snapshot = { doses, prn };
    setPrn((prev) =>
      prev.map((x) => (x.id === prnId ? { ...x, takenToday: x.takenToday + 1, lastTaken: nowTimeLabel() } : x))
    );
    toast.success(t("today.prnLogged", { name: p.name }));
    void persist(() => logPrnAction(prnId), snapshot);
  };

  const createRefill = (medId: string, medName: string) => {
    toast.success(t("refill.created"), { description: t("refill.createdDesc", { name: medName }) });
    void createRefillTask(medId).then((res) => {
      if (!res.ok) toast.error(res.error ?? t("refill.failed"));
    });
  };

  // Adherence that updates live: today's column is derived from the in-progress dose list (so a
  // freshly given/missed dose is reflected immediately), the prior 6 days come from the server.
  const liveAdherence = React.useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayCells = doses.map((d) =>
      d.status === "given" ? "given" : d.status === "upcoming" ? "upcoming" : "missed"
    ) as ("given" | "missed" | "upcoming")[];

    const priorDays = (adherence?.days ?? []).filter((d) => d.date !== todayStr);
    const days = [...priorDays, { date: todayStr, cells: todayCells }];

    let given = 0;
    let missed = 0;
    for (const day of days) {
      for (const c of day.cells) {
        if (c === "given") given++;
        else if (c === "missed") missed++;
      }
    }
    return { given, missed, days };
  }, [adherence, doses]);

  const dosesByPeriod = React.useMemo(() => {
    const groups: Record<Period, Dose[]> = { Morning: [], Afternoon: [], Evening: [], Night: [] };
    doses.forEach((d) => groups[d.period].push(d));
    return groups;
  }, [doses]);

  const isViewingToday = dayOffset === 0;
  const hasDoses = doses.length > 0;

  return (
    <div className="space-y-5">
      {/* Quick add (managers only) — also available on the All medications tab */}
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" className="h-10" onClick={onAddMedication}>
            <Plus className="h-4 w-4" />
            <span className="ml-1">{t("addMedication")}</span>
          </Button>
        </div>
      )}

      {/* Date stepper + progress header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setDayOffset((o) => o - 1)}
              aria-label={t("today.prevDay")}
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
              aria-label={t("today.nextDay")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isViewingToday && hasDoses && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium tabular-nums">
                  {t("today.dosesGiven", { given: givenCount, total: totalCount })}
                </p>
                <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
                  {Math.round(progressPct)}%
                </Badge>
              </div>
              <Progress value={progressPct} aria-label={t("today.dosesGivenAria", { given: givenCount, total: totalCount })} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly adherence mini-view (today's column updates live with the dose list) */}
      <AdherenceGrid summary={liveAdherence} />

      {!isViewingToday ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">{t("today.noScheduleForDay", { day: dateLabel })}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("today.switchBack")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDayOffset(0)}>
              {t("today.backToToday")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scheduled doses grouped by period */}
          {hasDoses ? (
            <div className="space-y-5">
              {PERIOD_ORDER.map((period) => {
                const list = dosesByPeriod[period];
                if (list.length === 0) return null;
                const Icon = periodMeta[period].icon;
                const periodGiven = list.filter((d) => d.status === "given").length;
                const periodLabel = t(`periods.${period.toLowerCase()}` as "periods.morning");
                return (
                  <section key={period} aria-label={periodLabel}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <Icon className={cn("h-4 w-4", periodMeta[period].tint)} aria-hidden="true" />
                      <h3 className="text-sm font-semibold">{periodLabel}</h3>
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
                          onCreateRefill={() => createRefill(dose.medId, dose.name)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                  <Clock className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="font-medium">{t("today.noDosesTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("today.noDosesBody")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* PRN */}
          {prn.length > 0 && (
            <section aria-label={t("today.asNeeded")}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold">{t("today.asNeeded")}</h3>
              </div>
              <ul className="space-y-2">
                {prn.map((p) => (
                  <PrnRow key={p.id} prn={p} canRecord={canRecord} onLog={() => logPrn(p.id)} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Confirm skipped/refused */}
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "refused" ? t("today.confirmRefusedTitle") : t("today.confirmSkippedTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "refused"
                ? t("today.confirmRefusedDesc")
                : t("today.confirmSkippedDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirm(null)}>{t("today.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) setOutcome(confirm.doseId, confirm.kind);
                setConfirm(null);
              }}
            >
              {t("today.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
