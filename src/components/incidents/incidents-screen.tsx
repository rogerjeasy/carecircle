"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IncidentCard } from "./incident-card";
import { ReportIncidentButton } from "./report-incident-button";
import type { Incident, IncidentsData } from "./types";

/** The Incidents list: open incidents first, then resolved, with a Report trigger. */
export function IncidentsScreen({ initial }: { initial: IncidentsData | null }) {
  const incidents = initial?.incidents ?? [];
  const recipientName = initial?.recipientName ?? "your loved one";

  const open = incidents.filter((i) => i.status === "open");
  const resolved = incidents.filter((i) => i.status === "resolved");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Incidents</h1>
          <p className="mt-1 text-muted-foreground">Falls, hospitalizations and emergencies for {recipientName}.</p>
        </div>
        <ReportIncidentButton variant="default" className="w-full sm:w-auto" />
      </div>

      {incidents.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <Section title="Open" count={open.length} items={open} emptyHint="No open incidents — all clear." />
          {resolved.length > 0 && <Section title="Resolved" count={resolved.length} items={resolved} />}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  items,
  emptyHint,
}: {
  title: string;
  count: number;
  items: Incident[];
  emptyHint?: string;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="tabular-nums">{count}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((i) => (
            <IncidentCard key={i.id} incident={i} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
        <ShieldCheck className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">No incidents reported</p>
        <p className="mt-1 text-sm text-muted-foreground">That&apos;s good news. Report one here if something happens.</p>
      </div>
      <ReportIncidentButton variant="outline" />
    </div>
  );
}
