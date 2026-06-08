-- ============================================================================
-- CareCircle — Ask conversations: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/.../0026. Reuses app_user_circle_ids() and
-- current_app_user_id() from 0001.
--
-- Conversations are PRIVATE to the user who started them: a row is visible/mutable only if its
-- circle_id is one of the caller's circles AND its user_id is the caller. So each caregiver keeps
-- their own assistant history; co-members of the same circle never see each other's chats. There's
-- no sensitivity tiering here, so a single FOR ALL policy is correct (it does not leak into SELECT).
-- ============================================================================

alter table "ask_conversation" enable row level security;
--> statement-breakpoint
create policy ask_conversation_rw on "ask_conversation" for all
  using (circle_id in (select app_user_circle_ids()) and user_id = current_app_user_id())
  with check (circle_id in (select app_user_circle_ids()) and user_id = current_app_user_id());
--> statement-breakpoint

alter table "ask_message" enable row level security;
--> statement-breakpoint
create policy ask_message_rw on "ask_message" for all
  using (circle_id in (select app_user_circle_ids()) and user_id = current_app_user_id())
  with check (circle_id in (select app_user_circle_ids()) and user_id = current_app_user_id());
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "ask_conversation" to carecircle_app;
    grant select, insert, update, delete on "ask_message" to carecircle_app;
  end if;
end
$$;
