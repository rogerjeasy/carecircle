"use client";

/**
 * "Push on this device" — the bridge between the Push column of the matrix (a preference) and the
 * browser. The matrix says WHICH activity a member wants pushed; this registers THIS browser as a
 * destination (Service Worker + Web Push subscription). Degrades honestly: shows why push is
 * unavailable when the browser can't do it or the server has no VAPID keys configured.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleRow } from "./section";
import { getPushPublicKey } from "@/lib/push/actions";
import { enablePush, disablePush, isSubscribed, pushSupport, notificationPermission } from "@/lib/push/client";

type State =
  | { kind: "loading" }
  | { kind: "unsupported" }
  | { kind: "unconfigured" }
  | { kind: "ready"; subscribed: boolean; blocked: boolean };

export function PushDeviceToggle() {
  const t = useTranslations("settings.push");
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (pushSupport() !== "supported") {
        if (active) setState({ kind: "unsupported" });
        return;
      }
      const { enabled } = await getPushPublicKey();
      if (!active) return;
      if (!enabled) {
        setState({ kind: "unconfigured" });
        return;
      }
      const subscribed = await isSubscribed();
      if (active) setState({ kind: "ready", subscribed, blocked: notificationPermission() === "denied" });
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const res = next ? await enablePush() : await disablePush();
      if (!res.ok) {
        toast.error(res.error);
        setState((s) => (s.kind === "ready" ? { ...s, blocked: notificationPermission() === "denied" } : s));
        return;
      }
      setState({ kind: "ready", subscribed: next, blocked: notificationPermission() === "denied" });
      toast.success(next ? t("enabled") : t("disabled"));
    } finally {
      setBusy(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const note =
    state.kind === "unsupported"
      ? t("unsupported")
      : state.kind === "unconfigured"
        ? t("unconfigured")
        : state.blocked
          ? t("blocked")
          : t("ready");

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <ToggleRow
          title={
            <span className="flex items-center gap-1.5">
              <BellRing className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("title")}
            </span>
          }
          description={note}
          control={
            <Switch
              checked={state.kind === "ready" && state.subscribed}
              disabled={busy || state.kind !== "ready" || (state.kind === "ready" && state.blocked && !state.subscribed)}
              onCheckedChange={toggle}
              aria-label={t("enableAria")}
            />
          }
        />
      </CardContent>
    </Card>
  );
}
