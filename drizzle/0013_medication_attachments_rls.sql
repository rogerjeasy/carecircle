-- ============================================================================
-- CareCircle — Medication attachments: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0009/0011. Reuses app_user_circle_ids() /
-- app_user_role(circle) from 0001.
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Authorization mirrors managing medications (CareCircle-Data-Model.md): any member
-- may VIEW an attachment; only owners/family_admins may add or remove one.
-- ============================================================================

alter table medication_attachment enable row level security;
--> statement-breakpoint
create policy medication_attachment_select on medication_attachment for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy medication_attachment_manage on medication_attachment for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on medication_attachment to carecircle_app;
  end if;
end
$$;
