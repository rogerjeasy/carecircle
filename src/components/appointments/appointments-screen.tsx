"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarDays, List, Lock, Plus } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "./calendar-view";
import { ListView } from "./list-view";
import { AppointmentDetail } from "./appointment-detail";
import { AppointmentFormModal } from "./appointment-form-modal";
import { CalendarSkeleton, ListSkeleton } from "./appointment-skeletons";
import { GatedControl } from "./gated-control";
import { buildAppointments, CARE_RECIPIENT } from "./data";
import { canManageAppointments } from "./utils";
import { valuesToAppointment } from "./mapping";
import type { AppointmentFormValues } from "./schema";
import type { Appointment } from "./types";

type ModalState = { mode: "add" } | { mode: "edit"; appt: Appointment } | null;

/**
 * The Appointments screen: a Calendar / List view toggle over a shared set of appointments. Role
 * drives what's editable (caregiving roles) vs. view-only. Renders inside the AppShell.
 */
export function AppointmentsScreen() {
  const { role } = useAppShell();
  const canManage = canManageAppointments(role);

  // Capture "now" once so the demo data + calendar stay consistent across re-renders.
  const [now] = React.useState(() => new Date());
  const [appointments, setAppointments] = React.useState<Appointment[]>(() => buildAppointments(now));
  const [view, setView] = React.useState("calendar");
  const [selectedDay, setSelectedDay] = React.useState<Date>(() => now);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<ModalState>(null);
  const [loading, setLoading] = React.useState(true);
  const newIdRef = React.useRef(1);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const openAppt = appointments.find((a) => a.id === openId) ?? null;

  const patchAppt = React.useCallback((id: string, patch: Partial<Appointment>) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const handleSubmit = (values: AppointmentFormValues) => {
    if (modal?.mode === "edit") {
      const updated = valuesToAppointment(values, modal.appt.id, modal.appt);
      setAppointments((prev) => prev.map((a) => (a.id === modal.appt.id ? updated : a)));
      setSelectedDay(updated.start);
      toast.success(`${updated.title} updated`);
    } else {
      const id = `appt-new-${newIdRef.current++}`;
      const created = valuesToAppointment(values, id);
      setAppointments((prev) => [created, ...prev]);
      setSelectedDay(created.start);
      toast.success(`${created.title} added`, { description: "Scheduled and added to the calendar." });
    }
    setModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Appointments</h1>
          <p className="mt-1 text-muted-foreground">
            Plan {CARE_RECIPIENT.name}&apos;s visits, prep questions, and who&apos;s taking them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              View only
            </Badge>
          )}
          <GatedControl canManage={canManage}>
            <Button onClick={() => setModal({ mode: "add" })}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">Add appointment</span>
            </Button>
          </GatedControl>
        </div>
      </div>

      {/* View toggle */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="w-full max-w-xs">
          <TabsTrigger value="calendar" className="flex-1">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="flex-1">
            <List className="h-4 w-4" aria-hidden="true" />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <CalendarView
              appointments={appointments}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onOpenAppt={setOpenId}
              onAdd={() => setModal({ mode: "add" })}
              canManage={canManage}
              now={now}
            />
          )}
        </TabsContent>

        <TabsContent value="list">
          {loading ? (
            <ListSkeleton />
          ) : (
            <ListView
              appointments={appointments}
              onOpenAppt={setOpenId}
              onAdd={() => setModal({ mode: "add" })}
              canManage={canManage}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail */}
      {openAppt && (
        <AppointmentDetail
          key={openAppt.id}
          appt={openAppt}
          open
          onOpenChange={(o) => !o && setOpenId(null)}
          canManage={canManage}
          onPatch={(patch) => patchAppt(openAppt.id, patch)}
          onEdit={() => {
            const appt = openAppt;
            setOpenId(null);
            setModal({ mode: "edit", appt });
          }}
          onPostToTimeline={() =>
            toast.success("Posted to timeline", {
              description: `${openAppt.title} summary shared with the family.`,
            })
          }
        />
      )}

      {/* Add / Edit form */}
      {modal && (
        <AppointmentFormModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.appt : undefined}
          defaultDate={selectedDay}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
