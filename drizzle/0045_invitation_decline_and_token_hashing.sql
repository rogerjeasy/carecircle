-- ============================================================================
-- Kintwadi — Invitation decline + token hashing at rest
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER (the admin/migration connection), same as 0005/0006.
--
-- 1. TOKEN HASHING AT REST. Invitation tokens are capability secrets (the link
--    IS the authorization), so like password-reset tokens (AGENTS.md §5) only
--    their SHA-256 may live in the database: a leaked row/backup must not yield
--    working join links. The app now stores `encode(digest(raw,'sha256'),'hex')`
--    and hashes the URL token before every lookup. The backfill below converts
--    legacy plaintext rows IN PLACE — already-emailed links keep working, because
--    hashing the raw token from an old link now matches the newly-hashed column.
--    (`invitation_details` / `accept_invitation` from 0006 are unchanged: they
--    compare `i.token = p_token` and the app simply passes the hash.)
--
-- 2. decline_invitation(token) — the missing half of accept_invitation (0006).
--    The decliner usually has NO account (and never will — that is the point of
--    declining), so this is SECURITY DEFINER keyed off the token alone: possession
--    of the capability secret is the authorization, exactly like the details
--    lookup. It only acts on a pending, unexpired invitation, flips it to
--    'declined' (single-use: a declined link can never be accepted), and writes
--    the audit row itself — a non-member can't satisfy the audit_log RLS insert
--    policy, and this state change must not go unrecorded. The actor is
--    current_app_user_id() when a signed-in user declines, NULL when anonymous.
-- ============================================================================

-- digest() lives in pgcrypto (available on Aurora PostgreSQL / RDS).
create extension if not exists pgcrypto;
--> statement-breakpoint

-- ── Backfill: hash any legacy plaintext token (idempotent — skips 64-hex rows) ─
update invitation
   set token = encode(digest(token, 'sha256'), 'hex'),
       updated_at = now()
 where token !~ '^[0-9a-f]{64}$';
--> statement-breakpoint

-- ── decline_invitation (token possession = authorization; session optional) ──
create or replace function decline_invitation(p_token text)
  returns table(circle_id uuid, invitation_id uuid)
  language plpgsql security definer set search_path = public
as $$
declare
  v_inv invitation%rowtype;
begin
  select * into v_inv from invitation
    where token = p_token and deleted_at is null
    limit 1;

  if not found then
    raise exception 'decline_invitation: invitation not found';
  end if;

  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'decline_invitation: invitation not valid';
  end if;

  update invitation
    set status = 'declined', updated_at = now()
    where id = v_inv.id;

  -- Audited here (as the owner) because the decliner is typically not a member
  -- and could never pass the audit_log RLS insert policy. No PII in the summary.
  insert into audit_log (circle_id, actor_user_id, action, entity_type, entity_id, summary)
    values (v_inv.circle_id, current_app_user_id(), 'update', 'invitation', v_inv.id, 'Invitation declined');

  return query select v_inv.circle_id, v_inv.id;
end;
$$;
--> statement-breakpoint

-- Privileges. Guarded so a fresh `db:migrate` before the role exists still succeeds.
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant execute on function decline_invitation(text) to carecircle_app;
  end if;
end
$$;
