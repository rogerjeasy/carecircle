"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

// A loosely-typed translator (avoids next-intl's fragile useTranslations<…> ReturnType generic).
type AlertsT = (key: string, vars?: Record<string, string | number>) => string;

/** Human-readable preview of what an enabled alert will trigger on. */
function previewText(metric: MetricKey, thr: Thresholds, t: AlertsT, metricName: string, moodLabel: string): string {
  if (!thr.enabled) return t("previewOff");
  switch (metric) {
    case "bp":
      return t("previewBp", { max: thr.max, diaMax: thr.diaMax ?? 0, min: thr.min, diaMin: thr.diaMin ?? 0 });
    case "sleep":
      return t("previewSleep", { min: thr.min });
    case "mood":
      return t("previewMood", { label: moodLabel });
    default:
      return t("previewGeneric", { metric: metricName.toLowerCase(), max: thr.max, min: thr.min, unit: metricConfigs[metric].unit });
  }
}

export interface HealthAlertsScreenProps {
  /** The circle's persisted ranges (server-loaded); defaults when there's no circle yet. */
  initialThresholds?: ThresholdMap;
}

/** The Health alerts settings panel: per-metric safe ranges, persisted per circle. */
export function HealthAlertsScreen({ initialThresholds }: HealthAlertsScreenProps) {
  const t = useTranslations("health.alertsScreen");
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
      toast.error(t("fixRanges"));
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("payload", JSON.stringify(thresholds));
    const res = await saveAlertThresholds(fd);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      toast.success(t("savedToast"), { description: t("savedToastDesc") });
    } else {
      toast.error(res.error ?? t("saveFailed"));
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
            {t("back")}
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("viewOnly")}
            </Badge>
          )}
          {canManage && (
            <Button onClick={save} disabled={saving} className="min-w-[7.5rem]">
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="ml-1">{t("saved")}</span>
                </>
              ) : saving ? (
                <span>{t("saving")}</span>
              ) : (
                <span>{t("saveChanges")}</span>
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
  const t = useTranslations("health.alertsScreen");
  const cfg = metricConfigs[metric];
  const Icon = metricIcons[metric];
  const enabled = thresholds.enabled;
  const rangeInvalid = thresholds.min >= thresholds.max;
  const metricName = useTranslations("health")(`metrics.${metric}` as "metrics.bp");
  const moodLabel = useTranslations("health")(`mood.${moodFace(thresholds.min).value}` as "mood.3");

  return (
    <Card className={cn("h-full p-0", !enabled && "opacity-90")}>
      <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.tint)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{metricName}</p>
            <p className="truncate text-xs text-muted-foreground">{cfg.unit || t("scale")}</p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => onPatch({ enabled: v })}
            disabled={!canManage}
            aria-label={t("enableAlerts", { name: metricName })}
          />
        </div>

        {enabled && (
          <div className="grid grid-cols-2 gap-3">
            <RangeInput
              id={`${metric}-min`}
              label={metric === "mood" ? t("alertBelow") : t("lowMin")}
              value={thresholds.min}
              onChange={(n) => onPatch({ min: n })}
              disabled={!canManage}
            />
            {metric !== "mood" && (
              <RangeInput
                id={`${metric}-max`}
                label={t("highMax")}
                value={thresholds.max}
                onChange={(n) => onPatch({ max: n })}
                disabled={!canManage}
              />
            )}
            {metric === "bp" && (
              <>
                <RangeInput
                  id="bp-diamin"
                  label={t("diaLow")}
                  value={thresholds.diaMin ?? 0}
                  onChange={(n) => onPatch({ diaMin: n })}
                  disabled={!canManage}
                />
                <RangeInput
                  id="bp-diamax"
                  label={t("diaHigh")}
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
            {t("minBelowMax")}
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
          <span>{previewText(metric, thresholds, t as AlertsT, metricName, moodLabel)}</span>
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
