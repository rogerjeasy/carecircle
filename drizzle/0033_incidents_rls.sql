-- ============================================================================
-- CareCircle — Incidents: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (admin/migration connection), like 0001/0009/0011/0017.
-- Reuses the helpers from 0001: app_user_circle_ids(), app_user_role(circle),
-- current_app_user_id().
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Authorization:
--   • incident SELECT — any member of the circle may see incidents.
--   • incident INSERT (report) — anyone EXCEPT a read-only relative (matches the report flow,
--     which a read_only "following along" relative cannot trigger).
--   • incident UPDATE (resolve / soft-delete) — coordinators + family only (mirrors
--     canResolveIncidents: owner, family_admin, family).
--   • incident_notification — members see all rows in their circle; the reporter INSERTs rows for
--     the people they notify (non read_only); a member may UPDATE only their OWN row (acknowledge).
--   • incident_comment — any member except read_only may post; an author (or owner/admin) may delete.
-- ============================================================================

-- ── incident ─────────────────────────────────────────────────────────────────
alter table "incident" enable row level security;
--> statement-breakpoint
create policy incident_select on "incident" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy incident_insert on "incident" for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient','clinician')
  );
--> statement-breakpoint
create policy incident_update on "incident" for update
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family')
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family')
  );
--> statement-breakpoint

-- ── incident_notification ──────────────────────────────────────────────────────
alter table "incident_notification" enable row level security;
--> statement-breakpoint
create policy incident_notification_select on "incident_notification" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
-- The reporter writes a row per notified member at report time (non read_only).
create policy incident_notification_insert on "incident_notification" for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient','clinician')
  );
--> statement-breakpoint
-- Acknowledge: a member may only update their OWN notification row.
create policy incident_notification_update on "incident_notification" for update
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint

-- ── incident_comment ───────────────────────────────────────────────────────────
alter table "incident_comment" enable row level security;
--> statement-breakpoint
create policy incident_comment_select on "incident_comment" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy incident_comment_insert on "incident_comment" for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient','clinician')
  );
--> statement-breakpoint
create policy incident_comment_delete on "incident_comment" for delete
  using (
    circle_id in (select app_user_circle_ids())
    and (
      app_user_role(circle_id) in ('owner','family_admin')
      or author_membership_id in (select id from membership where user_id = current_app_user_id())
    )
  );
--> statement-breakpoint

-- ── Privileges for the least-privilege app role (guarded; db:setup-rls re-grants) ──
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "incident" to carecircle_app;
    grant select, insert, update, delete on "incident_notification" to carecircle_app;
    grant select, insert, update, delete on "incident_comment" to carecircle_app;
  end if;
end
$$;
