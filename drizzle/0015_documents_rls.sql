-- ============================================================================
-- CareCircle — Documents vault: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0009/0011/0013. Reuses app_user_circle_ids()
-- and app_user_role(circle) from 0001.
--
-- Sensitivity is the crux (CareCircle-Data-Model.md §document SELECT predicate). A row is
-- visible only if its circle_id is one of the caller's circles AND the sensitivity tier
-- admits their role:
--   • standard   → any active member of the circle
--   • sensitive  → the care team + family (everyone EXCEPT a read-only relative)
--   • restricted → coordinators + family only (owner, family_admin, family)
-- SELECT is governed ONLY by this policy, so the manage policies below are split per-command
-- (INSERT/UPDATE/DELETE) — a `FOR ALL` policy would OR into SELECT and leak restricted rows.
--
-- Manage (upload / rename / delete / toggle emergency) → owner, family_admin, family, caregiver
-- (matches the UI's canUpload). "Access is enforced in the database, not just hidden."
-- ============================================================================

alter table "document" enable row level security;
--> statement-breakpoint
create policy document_select on "document" for select
  using (
    circle_id in (select app_user_circle_ids())
    and (
      sensitivity = 'standard'
      or (sensitivity = 'sensitive' and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient','clinician'))
      or (sensitivity = 'restricted' and app_user_role(circle_id) in ('owner','family_admin','family'))
    )
  );
--> statement-breakpoint
create policy document_insert on "document" for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver')
  );
--> statement-breakpoint
create policy document_update on "document" for update
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver')
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver')
  );
--> statement-breakpoint
create policy document_delete on "document" for delete
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver')
  );
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "document" to carecircle_app;
  end if;
end
$$;
