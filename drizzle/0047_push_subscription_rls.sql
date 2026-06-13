-- ============================================================================
-- Kintwadi — Web Push subscriptions: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (admin/migration connection), like 0001/0033/0038.
-- Reuses the helpers from 0001: app_user_circle_ids(), current_app_user_id().
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Authorization: a member manages ONLY their OWN device subscriptions — every command is
-- additionally pinned to a membership row owned by the current app user. (The dispatcher reads
-- subscriptions through the privileged platform connection, which bypasses RLS by design.)
-- ============================================================================

alter table "push_subscription" enable row level security;
--> statement-breakpoint
create policy push_subscription_select on "push_subscription" for select
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint
create policy push_subscription_insert on "push_subscription" for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint
create policy push_subscription_update on "push_subscription" for update
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint
create policy push_subscription_delete on "push_subscription" for delete
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint

-- ── Privileges for the least-privilege app role (guarded; db:setup-rls re-grants) ──
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "push_subscription" to carecircle_app;
  end if;
end
$$;
