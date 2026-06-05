-- ============================================================================
-- CareCircle — Row-Level Security
-- ----------------------------------------------------------------------------
-- This migration runs as the table OWNER (the admin/migration connection).
-- The running app connects as a SEPARATE least-privilege role (see SETUP.md)
-- that IS subject to these policies. Helper functions are SECURITY DEFINER so the
-- membership lookup runs as the owner (bypasses RLS) and never recurses.
--
-- Tenant rule in one line: a row is visible only if its circle_id is one of the
-- circles the signed-in user (app.current_user_id) actively belongs to.
-- ============================================================================

-- ── Helpers ─────────────────────────────────────────────────────────────────
create or replace function current_app_user_id() returns text
  language sql stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')
$$;
--> statement-breakpoint

create or replace function app_user_circle_ids() returns setof uuid
  language sql stable security definer set search_path = public
as $$
  select circle_id from membership
  where user_id = current_app_user_id()
    and status = 'active'
    and deleted_at is null
$$;
--> statement-breakpoint

create or replace function app_user_role(target_circle uuid) returns text
  language sql stable security definer set search_path = public
as $$
  select role::text from membership
  where circle_id = target_circle
    and user_id = current_app_user_id()
    and status = 'active'
    and deleted_at is null
  limit 1
$$;
--> statement-breakpoint

-- ── care_circle ─────────────────────────────────────────────────────────────
alter table care_circle enable row level security;
--> statement-breakpoint
create policy care_circle_select on care_circle for select
  using (id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy care_circle_update on care_circle for update
  using (id in (select app_user_circle_ids()) and app_user_role(id) in ('owner','family_admin'))
  with check (id in (select app_user_circle_ids()));
--> statement-breakpoint

-- ── care_recipient_profile ──────────────────────────────────────────────────
alter table care_recipient_profile enable row level security;
--> statement-breakpoint
create policy crp_select on care_recipient_profile for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy crp_mutate on care_recipient_profile for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- ── membership ──────────────────────────────────────────────────────────────
alter table membership enable row level security;
--> statement-breakpoint
create policy membership_select on membership for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy membership_manage on membership for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- ── timeline_event (private notes only visible to their author) ──────────────
alter table timeline_event enable row level security;
--> statement-breakpoint
create policy timeline_select on timeline_event for select
  using (
    circle_id in (select app_user_circle_ids())
    and (
      visibility <> 'private'
      or actor_membership_id in (select id from membership where user_id = current_app_user_id())
    )
  );
--> statement-breakpoint
create policy timeline_insert on timeline_event for insert
  with check (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint

-- ── audit_log (append-only: SELECT for admins, INSERT for members, never UPDATE/DELETE) ──
alter table audit_log enable row level security;
--> statement-breakpoint
create policy audit_select on audit_log for select
  using (app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint
create policy audit_insert on audit_log for insert
  with check (circle_id in (select app_user_circle_ids()));
