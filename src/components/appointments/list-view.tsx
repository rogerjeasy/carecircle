"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, History, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentCard } from "./appointment-card";
import { byStartAsc, byStartDesc, isHistoric } from "./utils";
import type { Appointment } from "./types";

export interface ListViewProps {
  appointments: Appointment[];
  onOpenAppt: (id: string) => void;
  onAdd: () => void;
  canManage: boolean;
}

/** The List view: appointments split into Upcoming / Past, each a responsive 2-up card grid. */
export function ListView({ appointments, onOpenAppt, onAdd, canManage }: ListViewProps) {
  const t = useTranslations("appointments");
  const upcoming = React.useMemo(
    () => appointments.filter((a) => !isHistoric(a)).sort(byStartAsc),
    [appointments]
  );
  const past = React.useMemo(
    () => appointments.filter(isHistoric).sort(byStartDesc),
    [appointments]
  );

  if (appointments.length === 0) {
    return <EmptyAppointments canManage={canManage} onAdd={onAdd} />;
  }

  return (
    <div className="space-y-8">
      <Section
        title={t("list.upcoming")}
        icon={Sparkles}
        count={upcoming.length}
        items={upcoming}
        onOpenAppt={onOpenAppt}
        emptyHint={t("list.emptyUpcoming")}
        canManage={canManage}
        onAdd={onAdd}
      />
      {past.length > 0 && (
        <Section
          title={t("list.past")}
          icon={History}
          count={past.length}
          items={past}
          onOpenAppt={onOpenAppt}
        />
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  items,
  onOpenAppt,
  emptyHint,
  canManage,
  onAdd,
}: {
  title: string;
  icon: typeof Sparkles;
  count: number;
  items: Appointment[];
  onOpenAppt: (id: string) => void;
  emptyHint?: string;
  canManage?: boolean;
  onAdd?: () => void;
}) {
  const t = useTranslations("appointments");
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <CalendarPlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
          {canManage && onAdd && (
            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">{t("list.addAppointment")}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((a) => (
            <AppointmentCard key={a.id} appt={a} onOpen={() => onOpenAppt(a.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyAppointments({ canManage, onAdd }: { canManage: boolean; onAdd: () => void }) {
  const t = useTranslations("appointments");
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <CalendarPlus className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">{t("list.emptyTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("list.emptyBody")}
        </p>
      </div>
      {canManage && (
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          <span className="ml-1">{t("list.addAppointment")}</span>
        </Button>
      )}
    </div>
  );
}
