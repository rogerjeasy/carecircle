-- ============================================================================
-- CareCircle — Health alert settings (safe ranges): Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0021/.../0036. Reuses app_user_circle_ids()
-- and app_user_role(circle) from 0001.
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Any member may SEE the alert ranges (they explain the status pills on /health);
-- editing them is for coordinators + family only (owner, family_admin, family) —
-- matches the UI's canManageAlerts = coordinator || family.
-- ============================================================================

alter table "health_alert_setting" enable row level security;
--> statement-breakpoint
create policy health_alert_setting_select on "health_alert_setting" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy health_alert_setting_manage on "health_alert_setting" for all
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner', 'family_admin', 'family')
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner', 'family_admin', 'family')
  );
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "health_alert_setting" to carecircle_app;
  end if;
end
$$;
