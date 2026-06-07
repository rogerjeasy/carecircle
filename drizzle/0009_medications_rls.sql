-- ============================================================================
-- CareCircle — Medications: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (the admin/migration connection), same as 0001/0005.
-- The running app connects as the least-privilege `carecircle_app` role, which
-- IS subject to these policies. Reuses the helpers from 0001:
--   app_user_circle_ids()  → the circles the signed-in user actively belongs to
--   app_user_role(circle)  → that user's role in a given circle
--
-- Tenant rule (same as everywhere): a row is visible only if its circle_id is one
-- of the caller's circles. Authorization tightens this per the project's role
-- matrix (CareCircle-Data-Model.md §authorization):
--   • Manage meds (add/edit/pause/stop)  → owner, family_admin
--   • Log a dose / PRN                    → owner, family_admin, family, caregiver, care_recipient
--   • read_only & clinician               → read access only (no writes)
-- ============================================================================

-- ── medication ───────────────────────────────────────────────────────────────
alter table medication enable row level security;
--> statement-breakpoint
create policy medication_select on medication for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy medication_manage on medication for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- ── medication_schedule (managed alongside its medication) ────────────────────
alter table medication_schedule enable row level security;
--> statement-breakpoint
create policy medication_schedule_select on medication_schedule for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy medication_schedule_manage on medication_schedule for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- ── medication_administration (the dose log) ──────────────────────────────────
-- Any circle member may SEE the dose log; only caregiving roles may write to it.
-- This is the high-volume "was it taken?" event stream, so it gets its own,
-- broader write set than the manage policies above.
alter table medication_administration enable row level security;
--> statement-breakpoint
create policy medication_admin_select on medication_administration for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy medication_admin_insert on medication_administration for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient')
  );
--> statement-breakpoint
create policy medication_admin_update on medication_administration for update
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient')
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient')
  );
--> statement-breakpoint
-- Undo a recorded dose = delete its row. Same caregiving write set.
create policy medication_admin_delete on medication_administration for delete
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient')
  );
--> statement-breakpoint

-- ── Privileges for the least-privilege app role ───────────────────────────────
-- ALTER DEFAULT PRIVILEGES (set in db:setup-rls) already covers tables created by
-- the admin role, but we grant explicitly too — guarded so a db:migrate that runs
-- BEFORE the role exists still succeeds (db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on medication to carecircle_app;
    grant select, insert, update, delete on medication_schedule to carecircle_app;
    grant select, insert, update, delete on medication_administration to carecircle_app;
  end if;
end
$$;
