"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { severityMeta, typeMeta } from "./data";
import { ackSummary, incidentTime } from "./utils";
import type { Incident } from "./types";

/** A list card linking to an incident's detail view. */
export function IncidentCard({ incident }: { incident: Incident }) {
  const t = useTranslations("incidents");
  const locale = useLocale();
  const meta = typeMeta[incident.type];
  const Icon = meta.icon;
  const sev = severityMeta[incident.severity];
  const acks = ackSummary(incident);
  const isHigh = incident.severity === "high" && incident.status !== "resolved";

  return (
    <Card className={cn("p-0", isHigh && "border-destructive/40")}>
      <Link
        href={`/incidents/${incident.id}`}
        className="flex h-full gap-3 rounded-2xl p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", meta.tint)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold leading-tight">
              {t(`types.${incident.type}.label` as "types.fall.label")}
            </p>
            <Badge variant={sev.badge} className="shrink-0">
              {t(`severities.${incident.severity}` as "severities.low")}
            </Badge>
            <Badge
              variant={incident.status === "resolved" ? "success" : "secondary"}
              className="ml-auto shrink-0"
            >
              {incident.status === "resolved" ? t("status.resolved") : t("status.open")}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{incident.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {incidentTime(incident.at, locale, { today: t("day.today"), yesterday: t("day.yesterday") })}
            </span>
            <span className="truncate">{t("card.by", { name: incident.reporterName })}</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {incident.comments.length}
            </span>
            <span className="tabular-nums">
              {t("card.ackCount", { acknowledged: acks.acknowledged, total: acks.total })}
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
