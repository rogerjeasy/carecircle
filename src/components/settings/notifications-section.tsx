"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Moon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsSection, Field, ToggleRow } from "./section";
import { DailyDigestSettings } from "./daily-digest-settings";
import { PushDeviceToggle } from "./push-device-toggle";
import { useIsPhone } from "./use-is-phone";
import {
  NOTIF_CHANNELS,
  NOTIF_TYPES,
  type ChannelKey,
  type NotifMatrix,
  type NotifTypeKey,
} from "./data";
import {
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationPrefs,
  type QuietHours,
} from "@/lib/notifications/settings";

export function NotificationsSettingsSection() {
  const t = useTranslations("settings.notifications");
  const isPhone = useIsPhone();
  const [prefs, setPrefs] = React.useState<NotificationPrefs | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let active = true;
    loadNotificationSettings().then((res) => {
      if (active && res.ok) setPrefs(res.prefs);
    });
    return () => {
      active = false;
    };
  }, []);

  // Optimistically apply `next`, persist it, and roll back on failure.
  const persist = (next: NotificationPrefs, prev: NotificationPrefs) => {
    setPrefs(next);
    startTransition(async () => {
      const res = await saveNotificationSettings(next);
      if (!res.ok) {
        setPrefs(prev);
        toast.error(res.error ?? t("saveFailed"));
      }
    });
  };

  if (!prefs) {
    return (
      <SettingsSection title={t("title")} description={t("description")}>
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </SettingsSection>
    );
  }

  const matrix = prefs.matrix as NotifMatrix;
  const quiet = prefs.quiet;

  const toggle = (type: NotifTypeKey, channel: ChannelKey) =>
    persist(
      { ...prefs, matrix: { ...matrix, [type]: { ...matrix[type], [channel]: !matrix[type][channel] } } },
      prefs,
    );

  const setQuiet = (patch: Partial<QuietHours>) => persist({ ...prefs, quiet: { ...quiet, ...patch } }, prefs);

  const typeLabel = (k: NotifTypeKey) => t(`types.${k}` as "types.meds");
  const channelLabel = (k: ChannelKey) => t(`channels.${k}` as "channels.inApp");

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      {/* Matrix */}
      <Card className="p-0">
        <CardContent className="p-4 sm:p-6">
          {isPhone ? (
            <ul className="space-y-3">
              {NOTIF_TYPES.map((nt) => (
                <li key={nt.key} className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-sm font-semibold">{typeLabel(nt.key)}</p>
                  <div className="space-y-2">
                    {NOTIF_CHANNELS.map((c) => (
                      <ToggleRow
                        key={c.key}
                        title={channelLabel(c.key)}
                        control={
                          <Switch
                            checked={matrix[nt.key][c.key]}
                            disabled={pending}
                            onCheckedChange={() => toggle(nt.key, c.key)}
                            aria-label={`${typeLabel(nt.key)} — ${channelLabel(c.key)}`}
                          />
                        }
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <table className="w-full min-w-[28rem] text-sm">
                <caption className="sr-only">{t("caption")}</caption>
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th scope="col" className="py-2.5 pr-4 text-left font-medium">{t("type")}</th>
                    {NOTIF_CHANNELS.map((c) => (
                      <th key={c.key} scope="col" className="px-4 py-2.5 text-center font-medium">
                        {channelLabel(c.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NOTIF_TYPES.map((nt) => (
                    <tr key={nt.key} className="border-b last:border-0">
                      <th scope="row" className="py-3 pr-4 text-left font-medium">{typeLabel(nt.key)}</th>
                      {NOTIF_CHANNELS.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-center">
                          <span className="inline-flex">
                            <Switch
                              checked={matrix[nt.key][c.key]}
                              disabled={pending}
                              onCheckedChange={() => toggle(nt.key, c.key)}
                              aria-label={`${typeLabel(nt.key)} — ${channelLabel(c.key)}`}
                            />
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register THIS browser as a push destination (the matrix Push column is the preference). */}
      <PushDeviceToggle />

      {/* Quiet hours */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <ToggleRow
            title={
              <span className="flex items-center gap-1.5">
                <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {t("quietHours")}
              </span>
            }
            description={t("quietHoursDesc")}
            control={
              <Switch
                checked={quiet.enabled}
                disabled={pending}
                onCheckedChange={(v) => setQuiet({ enabled: v })}
                aria-label={t("enableQuiet")}
              />
            }
          />
          {quiet.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor="quiet-from" label={t("from")}>
                <Input id="quiet-from" type="time" value={quiet.from} onChange={(e) => setQuiet({ from: e.target.value })} />
              </Field>
              <Field htmlFor="quiet-to" label={t("to")}>
                <Input id="quiet-to" type="time" value={quiet.to} onChange={(e) => setQuiet({ to: e.target.value })} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily digest — real nightly auto-send config + the caller's own opt-in. */}
      <DailyDigestSettings />
    </SettingsSection>
  );
}
