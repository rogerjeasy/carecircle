-- ============================================================================
-- CareCircle — Invitation acceptance (the other side of onboarding's invites)
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (the admin/migration connection), same as 0001/0005.
--
-- Two SECURITY DEFINER functions, both keyed off the invitation token (which is
-- the capability secret in the /invite/<token> link):
--
--   1. invitation_details(token) — read-only lookup for the PUBLIC invite page.
--      The invitee usually has no session (and isn't a member), so the RLS-bound
--      app role can't see the row. This runs as the owner and returns only safe
--      display fields for a single token, so the page can render the real circle,
--      inviter and role before anyone signs in.
--
--   2. accept_invitation(token) — the bootstrap that joins the CURRENT user to the
--      circle. Like provision_care_circle (0005), the invitee isn't a member yet,
--      so they can't insert their own `membership` under RLS. This validates the
--      token (pending + unexpired), creates the membership with the invited role,
--      and marks the invitation accepted — atomically, as the owner. It only ever
--      acts for the authenticated `app.current_user_id`.
-- ============================================================================

-- ── invitation_details (public, read-only) ───────────────────────────────────
create or replace function invitation_details(p_token text)
  returns table(
    circle_id uuid,
    circle_name text,
    recipient_name text,
    inviter_name text,
    role text,
    relationship_label text,
    personal_note text,
    status text,
    expires_at timestamptz,
    is_valid boolean
  )
  language sql stable security definer set search_path = public
as $$
  select
    i.circle_id,
    c.name,
    coalesce(rp.full_name, c.name),
    u.name,
    i.role::text,
    i.relationship_label,
    i.personal_note,
    i.status::text,
    i.expires_at,
    (i.status = 'pending' and i.expires_at > now() and i.deleted_at is null)
  from invitation i
  join care_circle c on c.id = i.circle_id
  left join care_recipient_profile rp on rp.circle_id = i.circle_id
  left join membership m on m.id = i.invited_by_membership_id
  left join "user" u on u.id = m.user_id
  where i.token = p_token
  limit 1
$$;
--> statement-breakpoint

-- ── accept_invitation (join the current user to the circle) ───────────────────
create or replace function accept_invitation(p_token text)
  returns table(circle_id uuid, membership_id uuid, role text, already_member boolean)
  language plpgsql security definer set search_path = public
as $$
declare
  v_uid text := current_app_user_id();
  v_inv invitation%rowtype;
  v_existing uuid;
  v_membership uuid;
begin
  if v_uid is null then
    raise exception 'accept_invitation: not authenticated';
  end if;

  select * into v_inv from invitation
    where token = p_token and deleted_at is null
    limit 1;

  if not found then
    raise exception 'accept_invitation: invitation not found';
  end if;

  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'accept_invitation: invitation not valid';
  end if;

  -- Idempotent: if the user already belongs to this circle (e.g. accepted twice),
  -- reuse that membership and still flip the invite to accepted.
  select id into v_existing from membership
    where circle_id = v_inv.circle_id and user_id = v_uid
    limit 1;

  if v_existing is null then
    insert into membership (circle_id, user_id, role, status, relationship_label)
      values (v_inv.circle_id, v_uid, v_inv.role, 'active', v_inv.relationship_label)
      returning id into v_membership;
  else
    v_membership := v_existing;
  end if;

  update invitation
    set status = 'accepted', accepted_at = now(), updated_at = now()
    where id = v_inv.id;

  return query select v_inv.circle_id, v_membership, v_inv.role::text, (v_existing is not null);
end;
$$;
--> statement-breakpoint

-- Privileges. Guarded so a fresh `db:migrate` before the role exists still succeeds.
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant execute on function invitation_details(text) to carecircle_app;
    grant execute on function accept_invitation(text) to carecircle_app;
  end if;
end
$$;
