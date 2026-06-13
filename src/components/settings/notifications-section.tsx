"use client";

import * as React from "react";
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
        toast.error(res.error ?? "Couldn't save. Please try again.");
      }
    });
  };

  if (!prefs) {
    return (
      <SettingsSection title="Notifications" description="Choose what you're notified about, and how.">
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

  return (
    <SettingsSection title="Notifications" description="Choose what you're notified about, and how.">
      {/* Matrix */}
      <Card className="p-0">
        <CardContent className="p-4 sm:p-6">
          {isPhone ? (
            <ul className="space-y-3">
              {NOTIF_TYPES.map((t) => (
                <li key={t.key} className="rounded-xl border bg-card p-3">
                  <p className="mb-2 text-sm font-semibold">{t.label}</p>
                  <div className="space-y-2">
                    {NOTIF_CHANNELS.map((c) => (
                      <ToggleRow
                        key={c.key}
                        title={c.label}
                        control={
                          <Switch
                            checked={matrix[t.key][c.key]}
                            disabled={pending}
                            onCheckedChange={() => toggle(t.key, c.key)}
                            aria-label={`${t.label} — ${c.label}`}
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
                <caption className="sr-only">Notification preferences by type and channel</caption>
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th scope="col" className="py-2.5 pr-4 text-left font-medium">Type</th>
                    {NOTIF_CHANNELS.map((c) => (
                      <th key={c.key} scope="col" className="px-4 py-2.5 text-center font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NOTIF_TYPES.map((t) => (
                    <tr key={t.key} className="border-b last:border-0">
                      <th scope="row" className="py-3 pr-4 text-left font-medium">{t.label}</th>
                      {NOTIF_CHANNELS.map((c) => (
                        <td key={c.key} className="px-4 py-3 text-center">
                          <span className="inline-flex">
                            <Switch
                              checked={matrix[t.key][c.key]}
                              disabled={pending}
                              onCheckedChange={() => toggle(t.key, c.key)}
                              aria-label={`${t.label} — ${c.label}`}
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
                Quiet hours
              </span>
            }
            description="Pause non-urgent notifications overnight. Urgent incidents always come through."
            control={
              <Switch
                checked={quiet.enabled}
                disabled={pending}
                onCheckedChange={(v) => setQuiet({ enabled: v })}
                aria-label="Enable quiet hours"
              />
            }
          />
          {quiet.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor="quiet-from" label="From">
                <Input id="quiet-from" type="time" value={quiet.from} onChange={(e) => setQuiet({ from: e.target.value })} />
              </Field>
              <Field htmlFor="quiet-to" label="To">
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
