/**
 * Live hub — the single, shared source of pushed updates for the admin System page.
 *
 * Why a hub: every connected admin shares ONE LISTEN connection and ONE health monitor, instead of
 * each browser tab polling. That makes server cost O(1) in the number of viewers, and ZERO when
 * nobody is watching (both the LISTEN connection and the monitor tear down on the last disconnect).
 *
 *   • Safety alerts → pure push. A Postgres trigger NOTIFYs `carecircle_safety` the instant an
 *     urgent/incident row is inserted (see db/setup-notify.ts); the hub re-reads the feed once and
 *     broadcasts it. No timer, no polling — work happens only when an incident actually occurs.
 *   • System health → AWS gives no "service down" event, so health is the one thing that must be
 *     actively probed. The hub runs a SINGLE shared probe on a slow interval and pushes only when
 *     a status/metric actually changes (delta push). Set `ADMIN_HEALTH_INTERVAL_MS=0` to disable it
 *     entirely (health then updates only on connect + manual refresh).
 *
 * Server-only. All reads are privileged/cross-tenant, so each push is audited per recipient.
 */
import 'server-only';
import { getPlatformClient, isPlatformDbConfigured, logPlatformAccess, type PlatformActor } from '@/db/admin-db';
import { getSystemHealth } from '@/lib/admin/system-health';
import { runStatusCheck } from '@/lib/admin/status-alerts';
import { querySafetyAlerts } from '@/db/admin-queries';
import type { SystemHealthData, SafetyData } from './system-types';

/** One connected admin's SSE sink + identity (identity is used to audit every pushed read). */
export type Subscriber = {
  actor: PlatformActor;
  send: (event: 'health' | 'safety', data: SystemHealthData | SafetyData) => void;
};

const SAFETY_CHANNEL = 'carecircle_safety';
const HEALTH_INTERVAL_MS = Number(process.env.ADMIN_HEALTH_INTERVAL_MS ?? 60_000);

const subscribers = new Set<Subscriber>();
let lastHealth: SystemHealthData | null = null;
let lastHealthKey = '';
let monitor: ReturnType<typeof setInterval> | null = null;
let listener: { unlisten: () => Promise<void> } | null = null;
let listenerStarting = false;

/** Status-only fingerprint (ignores `checkedAt`, which always changes) for delta-push. */
function healthKey(h: SystemHealthData): string {
  return JSON.stringify([h.services.map((s) => [s.name, s.status, s.metric]), h.metrics]);
}

function broadcastHealth(h: SystemHealthData) {
  for (const sub of subscribers) sub.send('health', h);
}

/** Probe health once and push to everyone — either always, or only when the fingerprint changed. */
async function refreshHealth(onlyOnChange: boolean) {
  const h = await getSystemHealth();
  lastHealth = h;
  // Opportunistic transition detection: while an admin is watching, the same probe results feed
  // the status-alert pipeline (snapshot + outage emails) so transitions are caught within ~a
  // minute instead of waiting for the cron. Fire-and-forget; alerting must never block the push.
  runStatusCheck(h).catch((err) =>
    console.error('[live-hub] status check failed:', (err as Error)?.name),
  );
  const key = healthKey(h);
  if (!onlyOnChange || key !== lastHealthKey) {
    lastHealthKey = key;
    broadcastHealth(h);
  }
}

/** A safety NOTIFY arrived (or first connect): read the feed once, push + audit per subscriber. */
async function pushSafety() {
  if (!isPlatformDbConfigured() || subscribers.size === 0) return;
  const alerts = await querySafetyAlerts();
  const payload: SafetyData = { alerts, checkedAt: new Date().toISOString() };
  for (const sub of subscribers) {
    // Shared query, but each admin who RECEIVES tenant data is logged individually.
    logPlatformAccess(sub.actor, 'safety_alerts_stream', { count: alerts.length });
    sub.send('safety', payload);
  }
}

/** Start the shared LISTEN connection + health monitor (no-ops if already running / unconfigured). */
function startBackground() {
  if (!isPlatformDbConfigured()) return;

  if (!listener && !listenerStarting) {
    listenerStarting = true;
    getPlatformClient()
      .listen(SAFETY_CHANNEL, () => {
        pushSafety().catch((err) => console.error('[live-hub] safety push failed:', (err as Error)?.name));
      })
      .then((meta) => {
        listener = meta;
        listenerStarting = false;
        if (subscribers.size === 0) stopBackground(); // everyone left while we were connecting
      })
      .catch((err) => {
        listenerStarting = false;
        console.error('[live-hub] LISTEN failed:', (err as Error)?.name);
      });
  }

  if (!monitor && HEALTH_INTERVAL_MS > 0) {
    monitor = setInterval(() => {
      refreshHealth(true).catch((err) => console.error('[live-hub] health probe failed:', (err as Error)?.name));
    }, HEALTH_INTERVAL_MS);
  }
}

/** Tear everything down once the last admin disconnects — zero background cost when idle. */
function stopBackground() {
  if (subscribers.size > 0) return;
  if (monitor) {
    clearInterval(monitor);
    monitor = null;
  }
  if (listener) {
    listener.unlisten().catch(() => {});
    listener = null;
  }
}

/**
 * Register a subscriber, send it an immediate snapshot of both feeds, and return an unsubscribe.
 * Starts the shared background work on the first subscriber; stops it after the last leaves.
 */
export async function subscribe(sub: Subscriber): Promise<() => void> {
  subscribers.add(sub);
  startBackground();

  // Immediate health snapshot: reuse the shared cache if warm, otherwise probe once.
  try {
    const h = lastHealth ?? (await getSystemHealth());
    lastHealth = h;
    lastHealthKey = healthKey(h);
    sub.send('health', h);
  } catch (err) {
    console.error('[live-hub] initial health failed:', (err as Error)?.name);
  }

  // Immediate safety snapshot (audited for this admin), or an honest empty feed when unconfigured.
  try {
    if (isPlatformDbConfigured()) {
      const alerts = await querySafetyAlerts();
      logPlatformAccess(sub.actor, 'safety_alerts_stream', { count: alerts.length });
      sub.send('safety', { alerts, checkedAt: new Date().toISOString() });
    } else {
      sub.send('safety', { alerts: [], checkedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error('[live-hub] initial safety failed:', (err as Error)?.name);
  }

  return () => {
    subscribers.delete(sub);
    stopBackground();
  };
}
