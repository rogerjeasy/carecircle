"use client";

import * as React from "react";
import { Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsSection, Field, ToggleRow } from "./section";
import { useIsPhone } from "./use-is-phone";
import {
  DEFAULT_MATRIX,
  NOTIF_CHANNELS,
  NOTIF_TYPES,
  type ChannelKey,
  type NotifMatrix,
  type NotifTypeKey,
} from "./data";

export function NotificationsSettingsSection() {
  const isPhone = useIsPhone();
  const [matrix, setMatrix] = React.useState<NotifMatrix>(DEFAULT_MATRIX);
  const [quiet, setQuiet] = React.useState({ enabled: true, from: "21:00", to: "07:00" });

  const toggle = (type: NotifTypeKey, channel: ChannelKey) =>
    setMatrix((prev) => ({ ...prev, [type]: { ...prev[type], [channel]: !prev[type][channel] } }));

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
                onCheckedChange={(v) => setQuiet((q) => ({ ...q, enabled: v }))}
                aria-label="Enable quiet hours"
              />
            }
          />
          {quiet.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor="quiet-from" label="From">
                <Input id="quiet-from" type="time" value={quiet.from} onChange={(e) => setQuiet((q) => ({ ...q, from: e.target.value }))} />
              </Field>
              <Field htmlFor="quiet-to" label="To">
                <Input id="quiet-to" type="time" value={quiet.to} onChange={(e) => setQuiet((q) => ({ ...q, to: e.target.value }))} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily digest */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div>
            <p className="text-sm font-semibold">Daily digest</p>
            <p className="text-xs text-muted-foreground">Choose who receives the evening summary and when.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field htmlFor="digest-who" label="Send to">
              <Input id="digest-who" defaultValue="Maria, Paolo" />
            </Field>
            <Field htmlFor="digest-when" label="Send at">
              <Input id="digest-when" type="time" defaultValue="20:00" />
            </Field>
          </div>
        </CardContent>
      </Card>
    </SettingsSection>
  );
}
