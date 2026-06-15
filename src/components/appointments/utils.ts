// Pure helpers shared across the Appointments screen.

import * as React from "react";
import { isPast, isSameDay, isToday, isTomorrow, isYesterday } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import type { UserRole } from "@/components/app-shell/app-shell-context";
import type { Appointment } from "./types";

/** Localized relative-day labels, supplied by the component from messages. */
export interface RelativeLabels {
  today: string;
  tomorrow: string;
  yesterday: string;
}

/** Scheduling/editing is open to active caregiving roles; recipients and read-only members view. */
export function canManageAppointments(role: UserRole): boolean {
  return role === "coordinator" || role === "family" || role === "caregiver";
}

/** First name only, for compact "Paolo is taking him" style attribution. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** An appointment counts as "past" once its start time has elapsed (cancelled ones too). */
export function isHistoric(appt: Appointment): boolean {
  return appt.status === "completed" || appt.status === "cancelled" || isPast(appt.start);
}

/** "Today" / "Tomorrow" / "Yesterday" / "Mon, Jun 9" — a friendly day label, locale-aware. */
export function friendlyDay(locale: string, date: Date, labels: RelativeLabels): string {
  if (isToday(date)) return labels.today;
  if (isTomorrow(date)) return labels.tomorrow;
  if (isYesterday(date)) return labels.yesterday;
  return date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
}

/** Compact time label, e.g. "10:30 AM" — locale-aware. */
export function timeLabel(locale: string, date: Date): string {
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/** "Tue, Jun 9 · 10:30 AM" — the one-line date+time used on cards and the detail header. */
export function dateTimeLabel(locale: string, date: Date, labels: RelativeLabels): string {
  return `${friendlyDay(locale, date, labels)} · ${timeLabel(locale, date)}`;
}

/**
 * Hook bundling the locale-aware date formatters with the relative labels resolved from messages,
 * so components don't each re-thread `locale` + the today/tomorrow/yesterday strings.
 */
export function useApptDates() {
  const locale = useLocale();
  const t = useTranslations("appointments");
  return React.useMemo(() => {
    const labels: RelativeLabels = {
      today: t("relative.today"),
      tomorrow: t("relative.tomorrow"),
      yesterday: t("relative.yesterday"),
    };
    return {
      locale,
      friendlyDay: (date: Date) => friendlyDay(locale, date, labels),
      timeLabel: (date: Date) => timeLabel(locale, date),
      dateTimeLabel: (date: Date) => dateTimeLabel(locale, date, labels),
    };
  }, [locale, t]);
}

/** Sort ascending by start (upcoming) — soonest first. */
export function byStartAsc(a: Appointment, b: Appointment): number {
  return a.start.getTime() - b.start.getTime();
}

/** Sort descending by start (past) — most recent first. */
export function byStartDesc(a: Appointment, b: Appointment): number {
  return b.start.getTime() - a.start.getTime();
}

/** All appointments that fall on a given calendar day, soonest first. */
export function appointmentsOnDay(appts: Appointment[], day: Date): Appointment[] {
  return appts.filter((a) => isSameDay(a.start, day)).sort(byStartAsc);
}

/** Count of done / total prep questions, for the "2/3 ready" hint. */
export function prepProgress(appt: Appointment): { done: number; total: number } {
  return { done: appt.prep.filter((q) => q.done).length, total: appt.prep.length };
}
