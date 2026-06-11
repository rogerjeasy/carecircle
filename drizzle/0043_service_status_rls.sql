-- ============================================================================
-- CareCircle — Platform service-status monitoring: lock-down + seed
-- ----------------------------------------------------------------------------
-- These are PLATFORM tables (no tenant data, no circle_id) used by the status
-- alerting pipeline (src/lib/admin/status-alerts.ts). Like platform_auth_audit
-- they are written/read only via the privileged admin connection — but unlike
-- it they hold staff emails, so we enable RLS with NO policies: the
-- least-privilege app role (which gets CRUD via default privileges) is denied
-- every row, while the owner connection bypasses RLS as usual. Fail-closed.
-- ============================================================================

alter table "service_status" enable row level security;
--> statement-breakpoint
alter table "status_alert_recipient" enable row level security;
--> statement-breakpoint

-- Seed the primary admin alert recipient (idempotent; respects the lower(email) unique index).
insert into "status_alert_recipient" ("email", "name", "active")
select 'rogerjeasy@gmail.com', 'Roger (admin)', true
where not exists (
  select 1 from "status_alert_recipient" where lower("email") = 'rogerjeasy@gmail.com'
);
