"use client";

/**
 * Live wrapper for the admin System page — driven by Server-Sent Events, NOT polling.
 *
 * Server-rendered with a first real snapshot (no loading flash), then opens a single long-lived
 * EventSource to `/api/admin/stream`. The server pushes `health` (on change) and `safety` (the
 * instant an incident is logged, via Postgres NOTIFY). The browser never polls; EventSource handles
 * reconnection on its own if the stream drops. The Refresh button is a one-off, user-initiated GET
 * (not a poll) that forces an immediate fresh health probe.
 */
import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SystemStatusBanner,
  SystemHealth,
  SafetyAlerts,
  MiniStat,
} from "@/components/admin/sections";
import type { SystemHealthData, SafetyData } from "@/lib/admin/system-types";

type ConnState = "connecting" | "live" | "interrupted";

export function AdminSystemLive({
  initialHealth,
  initialSafety,
}: {
  initialHealth: SystemHealthData;
  initialSafety: SafetyData;
}) {
  const [health, setHealth] = React.useState(initialHealth);
  const [safety, setSafety] = React.useState(initialSafety);
  const [conn, setConn] = React.useState<ConnState>("connecting");
  const [refreshing, setRefreshing] = React.useState(false);

  // Open the SSE stream once on mount; EventSource auto-reconnects, so there is no polling loop.
  React.useEffect(() => {
    const es = new EventSource("/api/admin/stream");

    es.addEventListener("open", () => setConn("live"));
    es.addEventListener("health", (e) => {
      setHealth(JSON.parse((e as MessageEvent).data));
      setConn("live");
    });
    es.addEventListener("safety", (e) => {
      setSafety(JSON.parse((e as MessageEvent).data));
      setConn("live");
    });
    // EventSource fires error on drop, then reconnects itself; reflect the transient state.
    es.addEventListener("error", () => {
      setConn(es.readyState === EventSource.CLOSED ? "interrupted" : "connecting");
    });

    return () => es.close();
  }, []);

  // One-off, user-initiated refresh — forces an immediate fresh health probe (bypasses the stream).
  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/system", { cache: "no-store" });
      if (res.ok) setHealth(await res.json());
    } catch {
      /* keep last good snapshot */
    } finally {
      setRefreshing(false);
    }
  }, []);

  const { metrics } = health;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <LiveIndicator state={conn} checkedAt={health.checkedAt} />
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <SystemStatusBanner services={health.services} />

      {/* Operational metrics — all measured */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat
          icon="activity"
          label="API + DB latency"
          value={`${metrics.apiLatencyMs}ms`}
          sub={`Aurora round-trip ${metrics.dbLatencyMs}ms`}
        />
        <MiniStat
          icon="gauge"
          label="Services healthy"
          value={`${metrics.servicesHealthy}/${metrics.servicesTotal}`}
          sub="reachable right now"
          tone={metrics.servicesHealthy === metrics.servicesTotal ? "success" : "warning"}
        />
        <MiniStat
          icon="alert"
          label="Open incidents"
          value={metrics.openIncidents}
          sub="urgent signals · last 24h"
          tone={metrics.openIncidents > 0 ? "warning" : "success"}
        />
      </section>

      {/* Services + safety: stack → 2-col on laptop+ */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SystemHealth services={health.services} />
        <SafetyAlerts alerts={safety.alerts} />
      </section>
    </div>
  );
}

// Deterministic across server + client (fixed locale + UTC) so the timestamp never causes a
// hydration mismatch.
const CLOCK_FMT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const STATE_META: Record<ConnState, { label: string; dot: string; ping: boolean }> = {
  connecting: { label: "Connecting…", dot: "bg-warning", ping: false },
  live: { label: "Live", dot: "bg-success", ping: true },
  interrupted: { label: "Reconnecting…", dot: "bg-destructive", ping: false },
};

/** Pulsing connection dot + the last-updated clock (UTC, to stay hydration-safe). */
function LiveIndicator({ state, checkedAt }: { state: ConnState; checkedAt: string }) {
  const meta = STATE_META[state];
  const label = `${CLOCK_FMT.format(new Date(checkedAt))} UTC`;

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        {meta.ping ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        ) : null}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", meta.dot)} />
      </span>
      {meta.label}
      <span className="tabular-nums">· updated {label}</span>
    </span>
  );
}
