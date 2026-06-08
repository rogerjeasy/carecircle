-- ============================================================================
-- CareCircle — Observations (health vitals): Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0009/.../0019. Reuses app_user_circle_ids()
-- and app_user_role(circle) from 0001.
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Any member may SEE the vitals; logging/editing a reading is open to everyone EXCEPT a
-- read-only relative (matches the UI's canLogReadings = role !== 'readonly').
-- ============================================================================

alter table "observation" enable row level security;
--> statement-breakpoint
create policy observation_select on "observation" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy observation_manage on "observation" for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) <> 'read_only')
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) <> 'read_only');
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "observation" to carecircle_app;
  end if;
end
$$;
