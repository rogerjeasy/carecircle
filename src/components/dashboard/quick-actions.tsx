"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pill, FileText, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportIncidentButton } from "@/components/incidents/report-incident-button";

export function QuickActions() {
  const t = useTranslations("dashboard.quickActions");
  const actions = [
    { key: "logMed", icon: Pill, href: "/medications" },
    { key: "addUpdate", icon: FileText, href: "/timeline" },
    { key: "newTask", icon: CheckSquare, href: "/tasks" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link key={action.key} href={action.href}>
          <Button variant="secondary" size="sm" className="gap-2">
            <action.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t(action.key)}</span>
            <span className="sm:hidden">{t(`${action.key}Short` as "logMedShort")}</span>
          </Button>
        </Link>
      ))}
      {/* Report incident opens the report flow (Dialog/Sheet) rather than navigating away. */}
      <ReportIncidentButton variant="secondary" size="sm" className="gap-2" label={t("report")} />
    </div>
  );
}
