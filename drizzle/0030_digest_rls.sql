-- ============================================================================
-- CareCircle — Daily Digest: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/.../0028. Reuses app_user_circle_ids(),
-- app_user_role(circle) and current_app_user_id() from 0001.
--
-- daily_digest: the digest is shared across the circle — ANY active member may read it; generating
-- or re-generating it (insert/update/delete) is open to everyone EXCEPT a read-only relative (it
-- reads the day's record). SELECT is its own policy so the manage policy can't gate reads.
--
-- digest_feedback: "was this helpful?" is PRIVATE to the rater — visible/mutable only by the user
-- who left it, within their circles.
-- ============================================================================

alter table "daily_digest" enable row level security;
--> statement-breakpoint
create policy daily_digest_select on "daily_digest" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy daily_digest_manage on "daily_digest" for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) <> 'read_only')
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) <> 'read_only');
--> statement-breakpoint

alter table "digest_feedback" enable row level security;
--> statement-breakpoint
create policy digest_feedback_rw on "digest_feedback" for all
  using (circle_id in (select app_user_circle_ids()) and user_id = current_app_user_id())
  with check (circle_id in (select app_user_circle_ids()) and user_id = current_app_user_id());
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "daily_digest" to carecircle_app;
    grant select, insert, update, delete on "digest_feedback" to carecircle_app;
  end if;
end
$$;
