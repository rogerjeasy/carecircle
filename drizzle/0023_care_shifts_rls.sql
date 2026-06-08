-- ============================================================================
-- CareCircle — Care rota (shifts): Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0009/.../0021. Reuses app_user_circle_ids()
-- and app_user_role(circle) from 0001.
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Any member may SEE the rota; editing it (add/remove shifts) is open to coordinators + family
-- (owner, family_admin, family) — matches the UI's canManageRota.
-- ============================================================================

alter table "care_shift" enable row level security;
--> statement-breakpoint
create policy care_shift_select on "care_shift" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy care_shift_manage on "care_shift" for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin','family'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin','family'));
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "care_shift" to carecircle_app;
  end if;
end
$$;
