/**
 * Shared TYPES for the platform super-admin console.
 *
 * The console renders only REAL data fetched through the audited cross-tenant path
 * (`src/db/admin-queries.ts` + `src/lib/admin/system-health.ts`). When the server returns nothing,
 * the UI shows a proper empty state — it never fabricates placeholder rows. This file therefore
 * holds the shared shapes the queries return and the components consume; no demo data lives here.
 */

export type Trend = { value: string; direction: "up" | "down" | "flat"; good: boolean };

export type Kpi = {
  key: string;
  label: string;
  value: number;
  format?: "number" | "ms" | "percent";
  suffix?: string;
  trend: Trend;
  hint: string;
};

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "invite"
  | "read";

export type AuditEvent = {
  id: string;
  time: string; // human, pre-formatted to avoid hydration drift
  actor: string;
  role: string;
  action: AuditAction;
  entity: string;
  circle: string;
  summary: string;
  severity: "info" | "notice" | "warning";
};

export type ServiceStatus = "operational" | "degraded" | "down";
export type Service = { name: string; detail: string; status: ServiceStatus; metric: string };

export type Tenant = {
  id: string;
  name: string;
  recipient: string;
  region: string;
  members: number;
  plan: "Free" | "Plus";
  lastActive: string;
  status: "healthy" | "attention";
};

export type Alert = { id: string; title: string; circle: string; level: "high" | "medium"; time: string };

/** One row in the service-status alert recipient list (/admin/system → notifications card). */
export type StatusRecipient = {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
};

// ── platform user directory (/admin/users) ──────────────────────────────────

/**
 * How an account exists on the platform:
 *  - `member`: a normal signed-up user;
 *  - `guest`:  an anonymous "Run demo" account (guest-…@guest.carecircle.demo);
 *  - `staff`:  a platform admin on the PLATFORM_ADMIN_EMAILS allowlist (managed via env, not here).
 */
export type PlatformUserKind = "member" | "guest" | "staff";

export type PlatformUserMembership = {
  id: string;
  circleId: string;
  circleName: string;
  role: string; // DB role enum value ('owner' | 'family_admin' | …)
  roleLabel: string;
  status: "active" | "invited" | "suspended";
};

export type PlatformUser = {
  id: string;
  name: string | null;
  email: string;
  kind: PlatformUserKind;
  emailVerified: boolean;
  hasPassword: boolean;
  oauthProviders: string[];
  lastSignIn: string | null; // human, pre-formatted to avoid hydration drift
  lastSignInAt: number | null; // epoch ms — for stats/sorting without re-parsing
  memberships: PlatformUserMembership[];
};
