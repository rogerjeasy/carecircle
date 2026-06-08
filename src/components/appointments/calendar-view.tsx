"use client";

import * as React from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentChip } from "./appointment-chip";
import { AssignedMember } from "./member-avatar";
import { StatusBadge } from "./status-badge";
import { useIsPhone } from "./use-is-phone";
import { kindMeta } from "./data";
import { useApptMembers } from "./members-context";
import { appointmentsOnDay, friendlyDay, timeLabel } from "./utils";
import type { Appointment } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarViewProps {
  appointments: Appointment[];
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
  onOpenAppt: (id: string) => void;
  onAdd: () => void;
  canManage: boolean;
  now: Date;
}

/**
 * The Calendar view. On tablet / laptop / desktop it keeps a full month grid (it never shrinks the
 * grid — on a wide desktop the day panel sits beside it, otherwise below it). On phone it swaps to
 * a week strip + day agenda so the month grid never has to squeeze into a narrow column.
 */
export function CalendarView(props: CalendarViewProps) {
  const isPhone = useIsPhone();
  return isPhone ? <PhoneAgenda {...props} /> : <MonthCalendar {...props} />;
}

/* ------------------------------------------------------------------ */
/* Tablet / laptop / desktop: full month grid + day panel             */
/* ------------------------------------------------------------------ */

function MonthCalendar({ appointments, selectedDay, onSelectDay, onOpenAppt, onAdd, canManage, now }: CalendarViewProps) {
  const [cursor, setCursor] = React.useState(() => startOfMonth(selectedDay));

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  return (
    <div className="flex flex-col gap-5 xl:flex-row">
      {/* Month grid — flexes to fill, never shrinks below its content */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            {format(cursor, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(now))}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 px-px">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-2 text-center text-xs font-medium text-muted-foreground">
              <span className="sm:hidden">{d[0]}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          role="grid"
          aria-label={`${format(cursor, "MMMM yyyy")} calendar`}
          className="grid grid-cols-7 overflow-hidden rounded-xl border-l border-t bg-card"
        >
          {days.map((day) => {
            const dayAppts = appointmentsOnDay(appointments, day);
            const inMonth = isSameMonth(day, cursor);
            const selected = isSameDay(day, selectedDay);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                role="gridcell"
                aria-selected={selected}
                className={cn(
                  "relative flex min-h-[4.75rem] min-w-0 flex-col gap-1 border-b border-r p-1.5 transition-colors sm:min-h-[6rem] lg:min-h-[7rem]",
                  !inMonth && "bg-muted/30",
                  selected ? "bg-accent/10" : "hover:bg-muted/40"
                )}
              >
                {/* Full-cell select target, behind the content. Keeping it a sibling (not an
                    ancestor) of the chip buttons avoids nesting interactive elements. */}
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-label={`${format(day, "EEEE, MMMM d")} — ${dayAppts.length} appointment${dayAppts.length === 1 ? "" : "s"}`}
                  className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                />
                {/* Content sits above the select button but ignores pointer events, so empty space
                    still selects the day — only the chips opt back in. */}
                <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                      today && "bg-primary font-semibold text-primary-foreground",
                      !today && !inMonth && "text-muted-foreground/60",
                      selected && !today && "ring-1 ring-accent"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <DayChips appts={dayAppts} onOpen={onOpenAppt} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day panel — below the grid on tablet/laptop, beside it on wide desktop */}
      <div className="w-full shrink-0 xl:w-80">
        <DayPanel
          day={selectedDay}
          appts={appointmentsOnDay(appointments, selectedDay)}
          onOpenAppt={onOpenAppt}
          onAdd={onAdd}
          canManage={canManage}
        />
      </div>
    </div>
  );
}

/** Up to two chips on small cells, a third only where there's vertical room (lg+), then "+N more". */
function DayChips({ appts, onOpen }: { appts: Appointment[]; onOpen: (id: string) => void }) {
  if (appts.length === 0) return null;
  const overflowBase = appts.length - 2;
  const overflowLg = appts.length - 3;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {appts.slice(0, 2).map((a) => (
        <AppointmentChip key={a.id} appt={a} onClick={() => onOpen(a.id)} className="pointer-events-auto" />
      ))}
      {appts[2] && (
        <div className="hidden lg:block">
          <AppointmentChip appt={appts[2]} onClick={() => onOpen(appts[2].id)} className="pointer-events-auto" />
        </div>
      )}
      {overflowBase > 0 && (
        <span className="px-1.5 text-[10px] font-medium text-muted-foreground lg:hidden">
          +{overflowBase} more
        </span>
      )}
      {overflowLg > 0 && (
        <span className="hidden px-1.5 text-[10px] font-medium text-muted-foreground lg:block">
          +{overflowLg} more
        </span>
      )}
    </div>
  );
}

/** The "clicking a day shows that day's appointments" panel. */
function DayPanel({
  day,
  appts,
  onOpenAppt,
  onAdd,
  canManage,
}: {
  day: Date;
  appts: Appointment[];
  onOpenAppt: (id: string) => void;
  onAdd: () => void;
  canManage: boolean;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">{friendlyDay(day)}</p>
            <p className="truncate text-xs text-muted-foreground">{format(day, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {appts.length} appt{appts.length === 1 ? "" : "s"}
          </span>
        </div>

        {appts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            {canManage && (
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                <span className="ml-1">Add appointment</span>
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {appts.map((a) => (
              <li key={a.id}>
                <AgendaRow appt={a} onOpen={() => onOpenAppt(a.id)} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Phone: week strip + day agenda                                     */
/* ------------------------------------------------------------------ */

function PhoneAgenda({ appointments, selectedDay, onSelectDay, onOpenAppt, onAdd, canManage, now }: CalendarViewProps) {
  // The visible week is derived straight from the selected day — no separate cursor to keep in sync.
  // The week chevrons move the selection a week at a time, which scrolls the strip with it.
  const weekStart = startOfWeek(selectedDay);
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) });
  const dayAppts = appointmentsOnDay(appointments, selectedDay);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {format(weekStart, "MMM d")} – {format(endOfWeek(weekStart), "MMM d")}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8" onClick={() => onSelectDay(now)}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onSelectDay(addWeeks(selectedDay, -1))}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onSelectDay(addWeeks(selectedDay, 1))}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const count = appointmentsOnDay(appointments, day).length;
              const selected = isSameDay(day, selectedDay);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-pressed={selected}
                  aria-label={`${format(day, "EEEE, MMMM d")} — ${count} appointment${count === 1 ? "" : "s"}`}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <span className={cn("text-[10px] font-medium", !selected && "text-muted-foreground")}>
                    {WEEKDAYS[day.getDay()][0]}
                  </span>
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                      today && !selected && "bg-accent/15 font-semibold text-accent"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      count > 0 ? (selected ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-baseline justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold">{friendlyDay(selectedDay)}</h3>
        <span className="text-xs text-muted-foreground">{format(selectedDay, "EEEE, MMMM d")}</span>
      </div>

      {dayAppts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center">
          <CalendarDays className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
          {canManage && (
            <Button variant="outline" size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">Add appointment</span>
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {dayAppts.map((a) => (
            <li key={a.id}>
              <AgendaRow appt={a} onOpen={() => onOpenAppt(a.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared agenda row (day panel + phone agenda)                       */
/* ------------------------------------------------------------------ */

function AgendaRow({ appt, onOpen }: { appt: Appointment; onOpen: () => void }) {
  const { byId } = useApptMembers();
  const Icon = kindMeta[appt.kind].icon;
  const member = byId(appt.assignedMemberId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", kindMeta[appt.kind].tint)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("min-w-0 truncate font-medium", appt.status === "cancelled" && "line-through")}>
            {appt.title}
          </p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{timeLabel(appt.start)}</span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{appt.provider}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={appt.status} />
          {member && <AssignedMember member={member} withLabel={false} size="sm" />}
        </div>
        {appt.location && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{appt.location}</span>
          </p>
        )}
      </div>
    </button>
  );
}
