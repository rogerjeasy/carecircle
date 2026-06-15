"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { kindMeta } from "./data";
import { timeLabel } from "./utils";
import type { Appointment } from "./types";

/**
 * A compact day-cell chip: a kind-coloured dot, the time, and the truncated title. Always
 * single-line — the title truncates so a busy day can never widen or overflow a calendar cell.
 */
export function AppointmentChip({
  appt,
  onClick,
  className,
}: {
  appt: Appointment;
  onClick?: () => void;
  className?: string;
}) {
  const locale = useLocale();
  const cancelled = appt.status === "cancelled";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={`${timeLabel(locale, appt.start)} · ${appt.title}`}
      className={cn(
        "flex w-full items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        cancelled && "opacity-60",
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", kindMeta[appt.kind].tint.split(" ")[0])}
        aria-hidden="true"
      />
      <span className="shrink-0 tabular-nums text-muted-foreground">{timeLabel(locale, appt.start)}</span>
      <span className={cn("min-w-0 flex-1 truncate font-medium", cancelled && "line-through")}>
        {appt.title}
      </span>
    </button>
  );
}
