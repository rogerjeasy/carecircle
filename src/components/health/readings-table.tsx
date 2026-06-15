"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill } from "./status-pill";
import { useIsPhone } from "./use-is-phone";
import { metricConfigs } from "./data";
import { useHealthMembers } from "./members-context";
import { formatValue, moodFace, statusOf } from "./utils";
import type { MetricKey, Reading, Thresholds } from "./types";

const MAX_ROWS = 12;

/** Readings beneath the focus chart: a real table on tablet+/desktop, stacked cards on phone. */
export function ReadingsTable({
  metric,
  series,
  thresholds,
}: {
  metric: MetricKey;
  /** Sorted oldest → newest; rendered newest first. */
  series: Reading[];
  thresholds: Thresholds;
}) {
  const t = useTranslations("health");
  const locale = useLocale();
  const isPhone = useIsPhone();
  const { byId } = useHealthMembers();
  const cfg = metricConfigs[metric];
  const metricName = t(`metrics.${metric}` as "metrics.bp");
  const rows = [...series].reverse().slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("table.none")}
      </p>
    );
  }

  const fullDate = (d: Date) => d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  const valueWithUnit = (r: Reading) =>
    metric === "mood"
      ? t(`mood.${moodFace(r.value).value}` as "mood.3")
      : `${formatValue(metric, r.value, r.secondary)}${cfg.unit ? ` ${cfg.unit}` : ""}`;

  if (isPhone) {
    return (
      <ul className="space-y-2" aria-label={t("table.readingsAria", { name: metricName })}>
        {rows.map((r) => {
          const member = byId(r.recordedBy);
          const status = statusOf(metric, r.value, r.secondary, thresholds);
          return (
            <li key={r.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums">{valueWithUnit(r)}</span>
                <StatusPill status={status} />
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="flex flex-col">
                  <dt className="text-muted-foreground">{t("table.date")}</dt>
                  <dd className="tabular-nums">{fullDate(r.at)}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-muted-foreground">{t("table.loggedBy")}</dt>
                  <dd className="truncate">{member?.name ?? "—"}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <caption className="sr-only">{t("table.caption", { name: metricName })}</caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-medium">{t("table.date")}</th>
            <th scope="col" className="px-4 py-2.5 font-medium">{t("table.value")}</th>
            <th scope="col" className="px-4 py-2.5 font-medium">{t("table.status")}</th>
            <th scope="col" className="px-4 py-2.5 font-medium">{t("table.loggedBy")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const member = byId(r.recordedBy);
            const status = statusOf(metric, r.value, r.secondary, thresholds);
            return (
              <tr key={r.id} className={cn(i % 2 === 1 && "bg-muted/20")}>
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{fullDate(r.at)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{valueWithUnit(r)}</td>
                <td className="px-4 py-2.5">
                  <StatusPill status={status} />
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className={cn("text-[10px] font-semibold", member?.color)}>
                        {member?.initials ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{member?.name ?? "—"}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
