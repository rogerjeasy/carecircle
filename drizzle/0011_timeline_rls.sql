-- ============================================================================
-- CareCircle — Timeline interactions: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (admin/migration connection), like 0001/0009. Reuses the
-- helpers from 0001: app_user_circle_ids() and app_user_role(circle).
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Authorization: any circle member may READ comments/reactions; everyone EXCEPT a
-- read-only relative may post a comment or react (read_only = "following along,
-- nothing to manage"). Un-reacting (delete) is allowed for the same write set.
-- (Note: timeline_event INSERT for new notes is governed by the existing
--  timeline_insert policy + the server action's role check.)
-- ============================================================================

-- ── timeline_comment ─────────────────────────────────────────────────────────
alter table timeline_comment enable row level security;
--> statement-breakpoint
create policy timeline_comment_select on timeline_comment for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy timeline_comment_insert on timeline_comment for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient','clinician')
  );
--> statement-breakpoint
-- An author (or an owner/admin, for moderation) may remove a comment.
create policy timeline_comment_delete on timeline_comment for delete
  using (
    circle_id in (select app_user_circle_ids())
    and (
      app_user_role(circle_id) in ('owner','family_admin')
      or author_membership_id in (select id from membership where user_id = current_app_user_id())
    )
  );
--> statement-breakpoint

-- ── timeline_reaction ────────────────────────────────────────────────────────
alter table timeline_reaction enable row level security;
--> statement-breakpoint
create policy timeline_reaction_select on timeline_reaction for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy timeline_reaction_insert on timeline_reaction for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient','clinician')
  );
--> statement-breakpoint
-- Un-react: you may only remove your OWN reaction.
create policy timeline_reaction_delete on timeline_reaction for delete
  using (
    circle_id in (select app_user_circle_ids())
    and membership_id in (select id from membership where user_id = current_app_user_id())
  );
--> statement-breakpoint

-- ── Privileges for the least-privilege app role (guarded; db:setup-rls re-grants) ──
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on timeline_comment to carecircle_app;
    grant select, insert, update, delete on timeline_reaction to carecircle_app;
  end if;
end
$$;
