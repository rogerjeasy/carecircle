-- ============================================================================
-- Kintwadi — Per-member notification read/dismissed state: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (admin/migration connection), like 0001/0033/0047.
-- Reuses the helpers from 0001: app_user_circle_ids(), current_app_user_id().
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Authorization: a member reads/writes ONLY their OWN state — every command is additionally
-- pinned to a membership row owned by the current app user.
-- ============================================================================

alter table "notification_state" enable row level security;
--> statement-breakpoint
create policy notification_state_select on "notification_state" for select
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint
create policy notification_state_insert on "notification_state" for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint
create policy notification_state_update on "notification_state" for update
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint
create policy notification_state_delete on "notification_state" for delete
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint

-- ── Privileges for the least-privilege app role (guarded; db:setup-rls re-grants) ──
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "notification_state" to carecircle_app;
  end if;
end
$$;
