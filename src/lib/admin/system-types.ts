/**
 * Shared shapes for the live system-health + safety data.
 *
 * Plain module (NO `server-only`) so both the server checkers (system-health.ts) and the client
 * poller (AdminSystemLive) can import these types. Service / ServiceStatus / Alert are re-used from
 * the demo-data module — the demo arrays and the live path intentionally share one shape so the
 * components render either source identically.
 */
export type { Service, ServiceStatus, Alert } from './dashboard-data';

/** Operational figures shown in the metric tiles — all measured, none hard-coded. */
export type HealthMetrics = {
  /** Measured server processing time of the health check (ms). */
  apiLatencyMs: number;
  /** Measured Aurora round-trip (ms). */
  dbLatencyMs: number;
  /** Services currently reporting operational. */
  servicesHealthy: number;
  /** Total services checked. */
  servicesTotal: number;
  /** Urgent safety signals raised across all circles in the last 24h. */
  openIncidents: number;
};

/** Response of GET /api/admin/system. */
export type SystemHealthData = {
  services: import('./dashboard-data').Service[];
  metrics: HealthMetrics;
  /** ISO timestamp the snapshot was taken — shown as "updated …". */
  checkedAt: string;
};

/** Response of GET /api/admin/safety. */
export type SafetyData = {
  alerts: import('./dashboard-data').Alert[];
  checkedAt: string;
};
