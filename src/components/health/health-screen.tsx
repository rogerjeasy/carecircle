"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Lock, Plus, SlidersHorizontal } from "lucide-react";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "./metric-card";
import { FocusChart } from "./focus-chart";
import { InsightsStrip } from "./insights-strip";
import { LogReadingModal } from "./log-reading-modal";
import { GatedControl } from "./gated-control";
import { HealthMembersProvider } from "./members-context";
import { DEFAULT_THRESHOLDS, METRIC_ORDER } from "./data";
import { canLogReadings, computeInsights } from "./utils";
import { defaultLogValues, logValuesToReading, type LogValues } from "./log-reading-form";
import { logObservation } from "@/lib/health/actions";
import type { HealthData, MetricKey, RangeKey, Reading } from "./types";

const RANGES: RangeKey[] = ["7d", "30d", "90d"];

export interface HealthScreenProps {
  /** Real vitals + members loaded server-side, or null when there's no circle/data. */
  initial: HealthData | null;
}

/** The Health screen: metric cards, a focus chart, insights, and a log-reading flow — server-backed. */
export function HealthScreen({ initial }: HealthScreenProps) {
  const { role } = useAppShell();
  const canLog = canLogReadings(role);

  const [now] = React.useState(() => new Date());
  const [readings, setReadings] = React.useState<Reading[]>(initial?.readings ?? []);
  const [range, setRange] = React.useState<RangeKey>("30d");
  const [focus, setFocus] = React.useState<MetricKey>("bp");
  const [logOpen, setLogOpen] = React.useState(false);

  const members = initial?.members ?? [];
  const currentMembershipId = initial?.currentMembershipId ?? null;
  const recipientName = initial?.recipientName ?? null;

  const insights = React.useMemo(
    () => computeInsights(readings, DEFAULT_THRESHOLDS, now),
    [readings, now]
  );

  const handleLog = async (values: LogValues) => {
    const tempId = `reading-temp-${Date.now()}`;
    const optimistic = logValuesToReading(values, tempId);
    setReadings((prev) => [optimistic, ...prev]);
    setFocus(optimistic.metric);
    setLogOpen(false);

    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        metric: optimistic.metric,
        value: optimistic.value,
        secondary: optimistic.secondary,
        atISO: optimistic.at.toISOString(),
        note: optimistic.note ?? "",
        recordedBy: values.recordedBy || "",
      })
    );
    const res = await logObservation(fd);
    if (res.ok) {
      setReadings((prev) => prev.map((r) => (r.id === tempId ? res.data : r)));
      toast.success("Reading saved", { description: "Added to the chart and shared on the timeline." });
    } else {
      setReadings((prev) => prev.filter((r) => r.id !== tempId));
      toast.error(res.error ?? "Couldn't save the reading");
    }
  };

  const isEmpty = readings.length === 0;

  return (
    <HealthMembersProvider members={members} currentMembershipId={currentMembershipId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Health</h1>
            <p className="mt-1 text-muted-foreground">
              {recipientName ? `${recipientName}'s` : "The"} vitals at a glance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!canLog && (
              <Badge variant="secondary" className="gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                View only
              </Badge>
            )}
            <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <TabsList aria-label="Time range">
                {RANGES.map((r) => (
                  <TabsTrigger key={r} value={r} className="px-3">
                    {r}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button variant="outline" asChild>
              <Link href="/health/alerts">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Alerts</span>
              </Link>
            </Button>
            <GatedControl canManage={canLog}>
              <Button onClick={() => setLogOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="ml-1">Log reading</span>
              </Button>
            </GatedControl>
          </div>
        </div>

        {isEmpty ? (
          <EmptyState canLog={canLog} onLog={() => setLogOpen(true)} />
        ) : (
          <>
            {insights.length > 0 && <InsightsStrip insights={insights} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {METRIC_ORDER.map((metric) => (
                <MetricCard
                  key={metric}
                  metric={metric}
                  readings={readings}
                  range={range}
                  thresholds={DEFAULT_THRESHOLDS[metric]}
                  now={now}
                  selected={metric === focus}
                  onSelect={() => setFocus(metric)}
                />
              ))}
            </div>

            <FocusChart
              metric={focus}
              onSelectMetric={setFocus}
              readings={readings}
              range={range}
              thresholds={DEFAULT_THRESHOLDS}
              now={now}
            />
          </>
        )}

        {logOpen && (
          <LogReadingModal
            open
            onOpenChange={setLogOpen}
            initialValues={defaultLogValues(now, focus, currentMembershipId ?? "")}
            onSubmit={handleLog}
          />
        )}
      </div>
    </HealthMembersProvider>
  );
}

function EmptyState({ canLog, onLog }: { canLog: boolean; onLog: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
        <Plus className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-semibold">No readings yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {canLog ? "Log the first vital to start tracking trends." : "Once a reading is logged, trends appear here."}
        </p>
      </div>
      {canLog && (
        <Button onClick={onLog}>
          <Plus className="h-4 w-4" />
          <span className="ml-1">Log reading</span>
        </Button>
      )}
    </div>
  );
}
