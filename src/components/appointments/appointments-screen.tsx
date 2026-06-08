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
import { GatedControl } from "./gated-control";
import { ApptMembersProvider } from "./members-context";
import { canManageAppointments } from "./utils";
import { valuesToAppointment } from "./mapping";
import { createAppointment, updateAppointment, patchAppointment } from "@/lib/appointments/actions";
import type { AppointmentFormValues } from "./schema";
import type { Appointment, AppointmentsData } from "./types";

type ModalState = { mode: "add" } | { mode: "edit"; appt: Appointment } | null;

export interface AppointmentsScreenProps {
  /** Real appointments + members loaded server-side, or null when there's no circle/data. */
  initial: AppointmentsData | null;
}

function valuesToPayload(values: AppointmentFormValues) {
  return {
    title: values.title.trim(),
    kind: values.kind,
    provider: values.provider.trim(),
    location: values.location.trim(),
    date: values.date,
    time: values.time,
    durationMin: values.durationMin,
    assigneeId: values.assignedMemberId || "",
    status: values.status,
  };
}

/** The Appointments screen: Calendar / List toggle over the active circle's real appointments. */
export function AppointmentsScreen({ initial }: AppointmentsScreenProps) {
  const { role } = useAppShell();
  const canManage = canManageAppointments(role);

  const [now] = React.useState(() => new Date());
  const [appointments, setAppointments] = React.useState<Appointment[]>(initial?.appointments ?? []);
  const [view, setView] = React.useState("calendar");
  const [selectedDay, setSelectedDay] = React.useState<Date>(() => now);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<ModalState>(null);

  const members = initial?.members ?? [];
  const recipientName = initial?.recipientName ?? null;
  const openAppt = appointments.find((a) => a.id === openId) ?? null;

  /** Optimistically apply a detail patch, then persist (revert on failure). */
  const patchAppt = React.useCallback(
    (id: string, patch: Partial<Appointment>) => {
      const prev = appointments;
      setAppointments((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      const fd = new FormData();
      fd.set("id", id);
      fd.set("patch", JSON.stringify(patch));
      void patchAppointment(fd).then((res) => {
        if (!res.ok) {
          setAppointments(prev);
          toast.error(res.error ?? "Couldn't save the change");
        }
      });
    },
    [appointments]
  );

  const handleSubmit = async (values: AppointmentFormValues) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(valuesToPayload(values)));

    if (modal?.mode === "edit") {
      const original = modal.appt;
      const optimistic = valuesToAppointment(values, original.id, original);
      setAppointments((p) => p.map((a) => (a.id === original.id ? optimistic : a)));
      setSelectedDay(optimistic.start);
      setModal(null);
      fd.set("id", original.id);
      const res = await updateAppointment(fd);
      if (res.ok) {
        setAppointments((p) => p.map((a) => (a.id === original.id ? res.data : a)));
        toast.success(`${res.data.title} updated`);
      } else {
        setAppointments((p) => p.map((a) => (a.id === original.id ? original : a)));
        toast.error(res.error ?? "Couldn't save the appointment");
      }
    } else {
      const tempId = `appt-temp-${Date.now()}`;
      const optimistic = valuesToAppointment(values, tempId);
      setAppointments((p) => [optimistic, ...p]);
      setSelectedDay(optimistic.start);
      setModal(null);
      const res = await createAppointment(fd);
      if (res.ok) {
        setAppointments((p) => p.map((a) => (a.id === tempId ? res.data : a)));
        toast.success(`${res.data.title} added`, { description: "Scheduled and added to the calendar." });
      } else {
        setAppointments((p) => p.filter((a) => a.id !== tempId));
        toast.error(res.error ?? "Couldn't add the appointment");
      }
    }
  };

  return (
    <ApptMembersProvider members={members} recipientName={recipientName}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Appointments</h1>
            <p className="mt-1 text-muted-foreground">
              Plan {recipientName ? `${recipientName}'s` : "upcoming"} visits, prep questions, and who&apos;s taking them.
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
            <CalendarView
              appointments={appointments}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onOpenAppt={setOpenId}
              onAdd={() => setModal({ mode: "add" })}
              canManage={canManage}
              now={now}
            />
          </TabsContent>

          <TabsContent value="list">
            <ListView
              appointments={appointments}
              onOpenAppt={setOpenId}
              onAdd={() => setModal({ mode: "add" })}
              canManage={canManage}
            />
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
    </ApptMembersProvider>
  );
}
