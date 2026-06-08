-- ============================================================================
-- CareCircle — Appointments: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0009/.../0017. Reuses app_user_circle_ids()
-- and app_user_role(circle) from 0001.
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Any member may SEE appointments; managing them (schedule/edit/assign/prep/summary/cancel)
-- is open to the active caregiving roles (owner, family_admin, family, caregiver) — matches the
-- UI's canManageAppointments. No sensitivity tier, so SELECT is simply tenant-scoped.
-- ============================================================================

alter table "appointment" enable row level security;
--> statement-breakpoint
create policy appointment_select on "appointment" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy appointment_manage on "appointment" for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin','family','caregiver'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin','family','caregiver'));
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "appointment" to carecircle_app;
  end if;
end
$$;
