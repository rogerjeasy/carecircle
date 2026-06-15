"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Lock, Plus } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnCallBanner } from "./on-call-banner";
import { WeekGrid } from "./week-grid";
import { ShiftFormModal } from "./shift-form-modal";
import { GatedControl } from "./gated-control";
import { RotaMembersProvider } from "./members-context";
import { canManageRota, onCallNow } from "./utils";
import { emptyShiftValues, valuesToShift, type ShiftFormValues } from "./shift-form";
import { createShift, deleteShift as deleteShiftAction } from "@/lib/rota/actions";
import type { RotaData, Shift } from "./types";

export interface RotaScreenProps {
  /** Real shifts + members loaded server-side, or null when there's no circle/data. */
  initial: RotaData | null;
}

/** The Care Rota screen: who's on across the week, with an "On call now" highlight + add-shift. */
export function RotaScreen({ initial }: RotaScreenProps) {
  const t = useTranslations("rota");
  const { role } = useAppShell();
  const canManage = canManageRota(role);

  const [now] = React.useState(() => new Date());
  const [shifts, setShifts] = React.useState<Shift[]>(initial?.shifts ?? []);
  const [addForDay, setAddForDay] = React.useState<number | null>(null);

  const members = initial?.members ?? [];
  const onCall = onCallNow(shifts, now, members);

  const handleSubmit = async (values: ShiftFormValues) => {
    const tempId = `shift-temp-${Date.now()}`;
    const optimistic = valuesToShift(values, tempId);
    setShifts((prev) => [...prev, optimistic]);
    setAddForDay(null);

    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        memberId: optimistic.memberId,
        dayIndex: optimistic.dayIndex,
        start: optimistic.start,
        end: optimistic.end,
        type: optimistic.type,
      })
    );
    const res = await createShift(fd);
    if (res.ok) {
      setShifts((prev) => prev.map((s) => (s.id === tempId ? res.data : s)));
      const member = members.find((m) => m.id === res.data.memberId);
      toast.success(member ? t("toasts.added", { name: member.name }) : t("toasts.addedFallback"));
    } else {
      setShifts((prev) => prev.filter((s) => s.id !== tempId));
      toast.error(res.error ?? t("toasts.addFailed"));
    }
  };

  const deleteShift = (id: string) => {
    const prev = shifts;
    setShifts((p) => p.filter((s) => s.id !== id));
    toast(t("toasts.removed"));
    void deleteShiftAction(id).then((res) => {
      if (!res.ok) {
        setShifts(prev);
        toast.error(res.error ?? t("toasts.removeFailed"));
      }
    });
  };

  return (
    <RotaMembersProvider members={members}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!canManage && (
              <Badge variant="secondary" className="gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {t("viewOnly")}
              </Badge>
            )}
            <GatedControl canManage={canManage}>
              <Button onClick={() => setAddForDay(now.getDay())} disabled={members.length === 0}>
                <Plus className="h-4 w-4" />
                <span className="ml-1">{t("addShift")}</span>
              </Button>
            </GatedControl>
          </div>
        </div>

        <OnCallBanner shifts={shifts} now={now} />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded border bg-muted" aria-hidden="true" />
            {t("legend.inPerson")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-4 rounded border border-dashed bg-muted" aria-hidden="true" />
            {t("legend.onCall")}
          </span>
        </div>

        <WeekGrid
          shifts={shifts}
          now={now}
          canManage={canManage}
          onAddOnDay={(dayIndex) => setAddForDay(dayIndex)}
          onDeleteShift={deleteShift}
          onCallShiftId={onCall?.shift.id}
        />

        {addForDay !== null && (
          <ShiftFormModal
            open
            onOpenChange={(o) => !o && setAddForDay(null)}
            initialValues={emptyShiftValues(addForDay)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </RotaMembersProvider>
  );
}
