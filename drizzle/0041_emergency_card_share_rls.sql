-- ============================================================================
-- CareCircle — Emergency-card share links: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0021/.../0038. Reuses app_user_circle_ids()
-- and app_user_role(circle) from 0001.
--
-- Tenant rule: a row is visible only if its circle_id is one of the caller's circles.
-- Any member may SEE the share links (the card page shows whether one is active and
-- when it expires); creating and revoking them is coordinator-only (owner,
-- family_admin) — matching the emergency-card manage roles in the app layer.
--
-- The anonymous /e/<token> read path NEVER touches this table through the app role:
-- it runs on the privileged connection, authorized by possession of the unguessable
-- token, and is audited. RLS here governs the signed-in management surface only.
-- ============================================================================

alter table "emergency_card_share" enable row level security;
--> statement-breakpoint
create policy emergency_card_share_select on "emergency_card_share" for select
  using (circle_id in (select app_user_circle_ids()));
--> statement-breakpoint
create policy emergency_card_share_manage on "emergency_card_share" for all
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner', 'family_admin')
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) in ('owner', 'family_admin')
  );
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "emergency_card_share" to carecircle_app;
  end if;
end
$$;
