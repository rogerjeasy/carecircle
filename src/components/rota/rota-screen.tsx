"use client";

import * as React from "react";
import { toast } from "sonner";
import { Lock, Plus } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnCallBanner } from "./on-call-banner";
import { WeekGrid } from "./week-grid";
import { ShiftFormModal } from "./shift-form-modal";
import { RotaSkeleton } from "./rota-skeletons";
import { GatedControl } from "./gated-control";
import { SHIFTS } from "./data";
import { canManageRota, memberById, onCallNow } from "./utils";
import { emptyShiftValues, valuesToShift, type ShiftFormValues } from "./shift-form";
import type { Shift } from "./types";

/** The Care Rota screen: who's on across the week, with an "On call now" highlight + add-shift. */
export function RotaScreen() {
  const { role } = useAppShell();
  const canManage = canManageRota(role);

  const [now] = React.useState(() => new Date());
  const [shifts, setShifts] = React.useState<Shift[]>(SHIFTS);
  const [addForDay, setAddForDay] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const newIdRef = React.useRef(1);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const onCall = onCallNow(shifts, now);

  const handleSubmit = (values: ShiftFormValues) => {
    const created = valuesToShift(values, `shift-new-${newIdRef.current++}`);
    setShifts((prev) => [...prev, created]);
    const member = memberById(created.memberId);
    toast.success(`${member ? member.name : "Shift"} added to the rota`);
    setAddForDay(null);
  };

  const deleteShift = (id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    toast("Shift removed");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Care rota</h1>
          <p className="mt-1 text-muted-foreground">Who&apos;s on this week — in person and on call.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!canManage && (
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              View only
            </Badge>
          )}
          <GatedControl canManage={canManage}>
            <Button onClick={() => setAddForDay(now.getDay())}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">Add shift</span>
            </Button>
          </GatedControl>
        </div>
      </div>

      {loading ? (
        <RotaSkeleton />
      ) : (
        <>
          <OnCallBanner shifts={shifts} now={now} />

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-4 rounded border bg-muted" aria-hidden="true" />
              In person
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-4 rounded border border-dashed bg-muted" aria-hidden="true" />
              On call
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
        </>
      )}

      {addForDay !== null && (
        <ShiftFormModal
          open
          onOpenChange={(o) => !o && setAddForDay(null)}
          initialValues={emptyShiftValues(addForDay)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
