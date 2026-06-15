"use client";

/**
 * The "Daily digest" card in Settings → Notifications — wired to real data.
 *
 * Loads the circle's nightly auto-send config + the caller's own delivery opt-in, and saves changes
 * through the audited server actions in src/lib/digest/settings.ts. Coordinators can turn the nightly
 * digest on/off for the whole circle and choose the send hour; everyone can opt their own email in
 * or out. Authorization is enforced server-side — `canManage` only governs what we render.
 */
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages, Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, ToggleRow } from "./section";
import {
  loadDigestSettings,
  updateDigestSettings,
  setMyDigestOptIn,
  setMyDigestLanguage,
  type DigestSettings,
} from "@/lib/digest/settings";
import { DIGEST_LANGUAGES } from "@/lib/digest/languages";

/** "20" → "8:00 PM" / "20:00" — a locale-formatted whole-hour label for the send-time picker. */
function hourLabel(locale: string, h: number): string {
  return new Date(2023, 0, 1, h, 0).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function DailyDigestSettings() {
  const t = useTranslations("settings.digest");
  const locale = useLocale();
  const [settings, setSettings] = React.useState<DigestSettings | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let active = true;
    loadDigestSettings().then((res) => {
      if (!active) return;
      if (res.ok) setSettings(res.settings);
      else setError(res.error);
    });
    return () => {
      active = false;
    };
  }, []);

  // Optimistically apply `next`, persist via `save`, and roll back on failure.
  function persist(next: DigestSettings, save: () => Promise<{ ok: boolean; error?: string }>, prev: DigestSettings) {
    setSettings(next);
    startTransition(async () => {
      const res = await save();
      if (!res.ok) {
        setSettings(prev);
        toast.error(res.error ?? t("saveFailed"));
      }
    });
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground sm:p-6">{error}</CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { enabled, hour, canManage, myOptIn, myLanguage } = settings;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div>
          <p className="text-sm font-semibold">{t("title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("desc")}
          </p>
        </div>

        {/* Circle-wide config — coordinators only. */}
        {canManage ? (
          <>
            <ToggleRow
              title={t("sendNightly")}
              description={t("sendNightlyDesc")}
              control={
                <Switch
                  checked={enabled}
                  disabled={pending}
                  onCheckedChange={(v) =>
                    persist({ ...settings, enabled: v }, () => updateDigestSettings({ enabled: v, hour }), settings)
                  }
                  aria-label={t("sendNightly")}
                />
              }
            />
            {enabled && (
              <Field htmlFor="digest-when" label={t("sendAt")} hint={t("sendAtHint")}>
                <Select
                  value={String(hour)}
                  disabled={pending}
                  onValueChange={(v) =>
                    persist(
                      { ...settings, hour: Number(v) },
                      () => updateDigestSettings({ enabled, hour: Number(v) }),
                      settings,
                    )
                  }
                >
                  <SelectTrigger id="digest-when" className="sm:max-w-[12rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {hourLabel(locale, h)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div className="border-t pt-4" />
          </>
        ) : (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {enabled ? t("coordSendsAt", { time: hourLabel(locale, hour) }) : t("coordOff")}
          </p>
        )}

        {/* Per-member opt-in — always available. */}
        <ToggleRow
          title={
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("emailToMe")}
            </span>
          }
          description={t("emailToMeDesc")}
          control={
            <Switch
              checked={myOptIn}
              disabled={pending || !enabled}
              onCheckedChange={(v) =>
                persist({ ...settings, myOptIn: v }, () => setMyDigestOptIn(v), settings)
              }
              aria-label={t("emailToMeAria")}
            />
          }
        />

        {/* Per-member language — the diaspora feature. Personal: each member reads (and is
            emailed) the same day's digest in their own language, translated once and cached. */}
        <Field
          htmlFor="digest-language"
          label={
            <span className="flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("myLanguage")}
            </span>
          }
          hint={t("myLanguageHint")}
        >
          <Select
            value={myLanguage}
            disabled={pending}
            onValueChange={(v) =>
              persist({ ...settings, myLanguage: v }, () => setMyDigestLanguage(v), settings)
            }
          >
            <SelectTrigger id="digest-language" className="sm:max-w-[14rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIGEST_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.code === "en" ? l.label : `${l.nativeLabel} · ${l.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}
