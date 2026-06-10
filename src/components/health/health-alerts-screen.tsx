"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellOff, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/app-shell/app-shell-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_THRESHOLDS, METRIC_ORDER, metricConfigs, metricIcons } from "./data";
import { canManageAlerts, moodFace } from "./utils";
import { saveAlertThresholds } from "@/lib/health/actions";
import type { MetricKey, ThresholdMap, Thresholds } from "./types";

/** Human-readable preview of what an enabled alert will trigger on. */
function previewText(metric: MetricKey, t: Thresholds): string {
  if (!t.enabled) return "Alerts are off for this metric.";
  switch (metric) {
    case "bp":
      return `Alert family if BP goes above ${t.max}/${t.diaMax} or below ${t.min}/${t.diaMin}.`;
    case "sleep":
      return `Alert family if sleep drops below ${t.min} h.`;
    case "mood":
      return `Alert family if mood drops below “${moodFace(t.min).label}”.`;
    default: {
      const u = metricConfigs[metric].unit;
      return `Alert family if ${metricConfigs[metric].name.toLowerCase()} goes above ${t.max} or below ${t.min} ${u}.`;
    }
  }
}

export interface HealthAlertsScreenProps {
  /** The circle's persisted ranges (server-loaded); defaults when there's no circle yet. */
  initialThresholds?: ThresholdMap;
}

/** The Health alerts settings panel: per-metric safe ranges, persisted per circle. */
export function HealthAlertsScreen({ initialThresholds }: HealthAlertsScreenProps) {
  const { role } = useAppShell();
  const canManage = canManageAlerts(role);

  const [thresholds, setThresholds] = React.useState<ThresholdMap>(() =>
    structuredCopy(initialThresholds ?? DEFAULT_THRESHOLDS)
  );
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const patch = (metric: MetricKey, p: Partial<Thresholds>) => {
    setSaved(false);
    setThresholds((prev) => ({ ...prev, [metric]: { ...prev[metric], ...p } }));
  };

  const rangesValid = METRIC_ORDER.every((m) => !thresholds[m].enabled || thresholds[m].min < thresholds[m].max);

  const save = async () => {
    if (!rangesValid) {
      toast.error("Please fix the highlighted ranges first.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(thresholds));
    const res = await saveAlertThresholds(fd);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      toast.success("Alert settings saved", {
        description: "New readings are checked against these ranges for the whole circle.",
      });
    } else {
      toast.error(res.error ?? "Couldn't save the alert settings");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/health"
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Health
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Health alerts</h1>
          <p className="mt-1 text-muted-foreground">
            Set the safe ranges that notify the family when a reading is out of range.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              View only
            </Badge>
          )}
          {canManage && (
            <Button onClick={save} disabled={saving} className="min-w-[7.5rem]">
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="ml-1">Saved</span>
                </>
              ) : saving ? (
                <span>Saving…</span>
              ) : (
                <span>Save changes</span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Per-metric editors, 2-up on tablet+/desktop, single column on phone */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {METRIC_ORDER.map((metric) => (
          <MetricAlertCard
            key={metric}
            metric={metric}
            thresholds={thresholds[metric]}
            canManage={canManage}
            onPatch={(p) => patch(metric, p)}
          />
        ))}
      </div>
    </div>
  );
}

function MetricAlertCard({
  metric,
  thresholds,
  canManage,
  onPatch,
}: {
  metric: MetricKey;
  thresholds: Thresholds;
  canManage: boolean;
  onPatch: (p: Partial<Thresholds>) => void;
}) {
  const cfg = metricConfigs[metric];
  const Icon = metricIcons[metric];
  const enabled = thresholds.enabled;
  const rangeInvalid = thresholds.min >= thresholds.max;

  return (
    <Card className={cn("h-full p-0", !enabled && "opacity-90")}>
      <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.tint)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{cfg.name}</p>
            <p className="truncate text-xs text-muted-foreground">{cfg.unit || "1–5 scale"}</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => onPatch({ enabled: v })}
            disabled={!canManage}
            aria-label={`Enable ${cfg.name} alerts`}
          />
        </div>

        {enabled && (
          <div className="grid grid-cols-2 gap-3">
            <RangeInput
              id={`${metric}-min`}
              label={metric === "mood" ? "Alert below" : "Low (min)"}
              value={thresholds.min}
              onChange={(n) => onPatch({ min: n })}
              disabled={!canManage}
            />
            {metric !== "mood" && (
              <RangeInput
                id={`${metric}-max`}
                label="High (max)"
                value={thresholds.max}
                onChange={(n) => onPatch({ max: n })}
                disabled={!canManage}
              />
            )}
            {metric === "bp" && (
              <>
                <RangeInput
                  id="bp-diamin"
                  label="Diastolic low"
                  value={thresholds.diaMin ?? 0}
                  onChange={(n) => onPatch({ diaMin: n })}
                  disabled={!canManage}
                />
                <RangeInput
                  id="bp-diamax"
                  label="Diastolic high"
                  value={thresholds.diaMax ?? 0}
                  onChange={(n) => onPatch({ diaMax: n })}
                  disabled={!canManage}
                />
              </>
            )}
          </div>
        )}

        {enabled && rangeInvalid && (
          <p className="text-xs font-medium text-destructive" role="alert">
            The minimum should be below the maximum.
          </p>
        )}

        {/* Preview */}
        <div
          className={cn(
            "mt-auto flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs",
            enabled ? "bg-primary/5 text-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {enabled ? (
            <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{previewText(metric, thresholds)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RangeInput({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        disabled={disabled}
        className="h-10"
      />
    </div>
  );
}

/** Shallow-deep copy of the default thresholds so edits don't mutate the shared default. */
function structuredCopy(map: ThresholdMap): ThresholdMap {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, { ...v }])) as ThresholdMap;
}
