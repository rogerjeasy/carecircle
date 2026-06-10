-- ============================================================================
-- CareCircle — Billing: Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/0009/0017. Reuses app_user_circle_ids() and
-- app_user_role(circle) from 0001.
--
-- Billing is sensitive + coordinator-owned: only owners / family_admins of the circle may SEE or
-- MANAGE payment methods and invoices. (Caregivers / family / read-only never see card or invoice
-- rows.) Payment methods carry no full PAN — only brand + last4 + expiry (see schema).
-- ============================================================================

-- ── payment_method ──────────────────────────────────────────────────────────
alter table "payment_method" enable row level security;
--> statement-breakpoint
create policy payment_method_select on "payment_method" for select
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint
create policy payment_method_manage on "payment_method" for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- ── invoice ─────────────────────────────────────────────────────────────────
alter table "invoice" enable row level security;
--> statement-breakpoint
create policy invoice_select on "invoice" for select
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint
create policy invoice_manage on "invoice" for all
  using (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'))
  with check (circle_id in (select app_user_circle_ids()) and app_user_role(circle_id) in ('owner','family_admin'));
--> statement-breakpoint

-- ── Privileges for the least-privilege app role (guarded; db:setup-rls re-grants) ──
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "payment_method" to carecircle_app;
    grant select, insert, update, delete on "invoice" to carecircle_app;
  end if;
end
$$;
