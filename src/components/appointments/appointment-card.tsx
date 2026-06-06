"use client";

import { Clock, ListChecks, MapPin, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AssignedMember } from "./member-avatar";
import { StatusBadge } from "./status-badge";
import { kindMeta } from "./data";
import { dateTimeLabel, memberById, prepProgress } from "./utils";
import type { Appointment } from "./types";

/**
 * A card in the List view: kind icon, title + status, provider, date+time, location, the assigned
 * member ("Paolo is taking him"), and a prep-readiness hint. The whole card opens the detail view.
 */
export function AppointmentCard({ appt, onOpen }: { appt: Appointment; onOpen: () => void }) {
  const Icon = kindMeta[appt.kind].icon;
  const member = memberById(appt.assignedMemberId);
  const prep = prepProgress(appt);
  const cancelled = appt.status === "cancelled";

  return (
    <Card className="h-full p-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col gap-3 rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5"
      >
        {/* Header: icon + title + status */}
        <div className="flex items-start gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", kindMeta[appt.kind].tint)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-semibold leading-tight", cancelled && "line-through")}>
              {appt.title}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{appt.provider}</span>
            </p>
          </div>
          <StatusBadge status={appt.status} className="shrink-0" />
        </div>

        {/* Meta: date+time, location */}
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate font-medium text-foreground">{dateTimeLabel(appt.start)}</span>
          </p>
          {appt.location && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{appt.location}</span>
            </p>
          )}
        </div>

        {/* Footer: assigned member + prep hint */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <AssignedMember member={member} size="sm" className="min-w-0 flex-1" />
          {prep.total > 0 && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 text-xs tabular-nums",
                prep.done === prep.total ? "text-success" : "text-muted-foreground"
              )}
              title={`${prep.done} of ${prep.total} prep questions ready`}
            >
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              {prep.done}/{prep.total}
            </span>
          )}
        </div>
      </button>
    </Card>
  );
}
