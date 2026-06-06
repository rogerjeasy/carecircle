-- ============================================================================
-- CareCircle — Onboarding: invitation RLS + the circle-provisioning bootstrap
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (the admin/migration connection), same as 0001.
--
-- Two things this migration wires:
--   1. Row-Level Security for the new `invitation` table (same tenant rule as
--      everything else; only owners/admins may issue or revoke invites).
--   2. `provision_care_circle()` — a SECURITY DEFINER bootstrap that solves the
--      chicken-and-egg of creating a brand-new tenant: a fresh user has NO
--      membership yet, so the app role (which is subject to RLS) cannot insert
--      the first `care_circle` row (no INSERT policy) nor its first owner
--      `membership` (the manage policy requires an existing owner/admin). The
--      function runs as the owner (RLS-exempt, since FORCE RLS is intentionally
--      off) and creates BOTH atomically — but only ever for the *currently
--      authenticated* user, read from the trusted `app.current_user_id` GUC.
--      After it returns, the user IS the owner, so every later write in the same
--      onboarding transaction (recipient profile, timeline, invitations, audit)
--      flows through normal RLS.
-- ============================================================================

-- ── invitation ───────────────────────────────────────────────────────────────
alter table invitation enable row level security;
--> statement-breakpoint
create policy invitation_select on invitation for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy invitation_manage on invitation for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- ── provision_care_circle (bootstrap a new tenant for the current user) ───────
create or replace function provision_care_circle(
  p_name text,
  p_timezone text,
  p_relationship text
) returns table(circle_id uuid, membership_id uuid)
  language plpgsql security definer set search_path = public
as $$
declare
  v_uid text := current_app_user_id();
  v_circle uuid;
  v_membership uuid;
begin
  if v_uid is null then
    raise exception 'provision_care_circle: no authenticated user in session context';
  end if;

  insert into care_circle (name, primary_timezone)
    values (coalesce(nullif(p_name, ''), 'My Care Circle'), coalesce(nullif(p_timezone, ''), 'UTC'))
    returning id into v_circle;

  insert into membership (circle_id, user_id, role, status, relationship_label)
    values (v_circle, v_uid, 'owner', 'active', nullif(p_relationship, ''))
    returning id into v_membership;

  update care_circle set owner_membership_id = v_membership where id = v_circle;

  return query select v_circle, v_membership;
end;
$$;
--> statement-breakpoint

-- Privileges: the least-privilege app role must be able to run the bootstrap and
-- read/write invitations. Guarded so a fresh `db:migrate` that runs BEFORE the role
-- exists (see SETUP.md) still succeeds — `db:setup-rls` re-grants either way.
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant execute on function provision_care_circle(text, text, text) to carecircle_app;
    grant select, insert, update, delete on invitation to carecircle_app;
  end if;
end
$$;
