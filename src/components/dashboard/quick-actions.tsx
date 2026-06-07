"use client";

import Link from "next/link";
import { Pill, FileText, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportIncidentButton } from "@/components/incidents/report-incident-button";

export function QuickActions() {
  const actions = [
    { label: "Log medication", icon: Pill, href: "/medications" },
    { label: "Add update", icon: FileText, href: "/timeline" },
    { label: "New task", icon: CheckSquare, href: "/tasks" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link key={action.label} href={action.href}>
          <Button variant="secondary" size="sm" className="gap-2">
            <action.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{action.label}</span>
            <span className="sm:hidden">{action.label.split(" ")[0]}</span>
          </Button>
        </Link>
      ))}
      {/* Report incident opens the report flow (Dialog/Sheet) rather than navigating away. */}
      <ReportIncidentButton variant="secondary" size="sm" className="gap-2" label="Report incident" />
    </div>
  );
}
