"use client";

import { AlertTriangle, Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { SafetyWarning } from "./safety";

export interface SafetyCheckPanelProps {
  warnings: SafetyWarning[];
  acknowledged: boolean;
  onAcknowledgeChange: (value: boolean) => void;
  /** Set true after the user tried to save while an unacknowledged warning was present. */
  showAckError?: boolean;
}

/**
 * Inline "Safety check" panel. With no warnings it's a calm all-clear; with warnings it shows each
 * interaction/allergy as a warning card and requires an explicit acknowledgement before saving.
 */
export function SafetyCheckPanel({
  warnings,
  acknowledged,
  onAcknowledgeChange,
  showAckError,
}: SafetyCheckPanelProps) {
  const t = useTranslations("medications.form.safety");
  if (warnings.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-success">{t("passedTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("passedDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-3 sm:p-4"
      role="region"
      aria-label={t("regionAria")}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-warning">
          {t("heading", { count: warnings.length })}
        </h3>
      </div>

      <ul className="space-y-2">
        {warnings.map((w) => {
          const allergenLabel = w.allergen ? t(`allergens.${w.allergen}` as "allergens.penicillin") : "";
          const title =
            w.kind === "allergy"
              ? t("allergyTitle", { allergen: allergenLabel })
              : t("interactionTitle", { name: w.otherName ?? "" });
          const detail =
            w.kind === "allergy"
              ? t("allergyDetail", { allergen: allergenLabel })
              : t(`notes.${w.noteKey}` as "notes.warfarin-aspirin");
          return (
            <li
              key={w.id}
              className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-card p-2.5"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium">{title}</p>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      w.severity === "high"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/15 text-warning"
                    )}
                  >
                    {w.severity === "high" ? t("severityHigh") : t("severityModerate")}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {w.kind === "allergy" ? t("kindAllergy") : t("kindInteraction")}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Acknowledgement gate */}
      <label
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-card p-2.5 transition-colors",
          acknowledged ? "border-success/40" : showAckError ? "border-destructive" : "border-border"
        )}
      >
        <Checkbox
          checked={acknowledged}
          onCheckedChange={(v) => onAcknowledgeChange(v === true)}
          aria-label={t("ackAria")}
          className="mt-0.5"
        />
        <span className="min-w-0 text-xs">
          <span className="font-medium text-foreground">
            {t("ackLabel")}
          </span>
          {acknowledged && (
            <Check className="ml-1 inline h-3.5 w-3.5 text-success" aria-hidden="true" />
          )}
          {showAckError && !acknowledged && (
            <span className="mt-0.5 block font-medium text-destructive" role="alert">
              {t("ackError")}
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
