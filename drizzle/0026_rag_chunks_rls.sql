-- ============================================================================
-- CareCircle — RAG chunks (pgvector store for "Ask CareCircle"): Row-Level Security + grants
-- ----------------------------------------------------------------------------
-- Runs as the table OWNER, like 0001/.../0015. Reuses app_user_circle_ids() and
-- app_user_role(circle) from 0001.
--
-- This is the whole point of keeping vectors IN Aurora: retrieval inherits the SAME permission
-- boundary as the record. The SELECT policy mirrors the documents sensitivity tiers exactly, so a
-- cosine-similarity query can only ever return chunks the caller is allowed to read:
--   • standard   → any active member of the circle
--   • sensitive  → care team + family (everyone EXCEPT a read-only relative)
--   • restricted → coordinators + family only (owner, family_admin, family)
-- (audit-derived chunks are ingested as 'restricted', so only coordinators retrieve them.)
--
-- SELECT is governed ONLY by this policy, so manage is split per-command (INSERT/UPDATE/DELETE) —
-- a `FOR ALL` policy would OR into SELECT and leak restricted rows. Writing (ingest/backfill) is
-- open to any non-read-only member; a caregiver may write a 'restricted' chunk (when indexing a
-- restricted document they uploaded) without being able to read it back — same as the doc vault.
-- Historical backfill runs via the admin connection (RLS-bypassing) so it can index every tier.
-- ============================================================================

alter table "rag_chunk" enable row level security;
--> statement-breakpoint
create policy rag_chunk_select on "rag_chunk" for select
  using (
    circle_id in (select app_user_circle_ids())
    and (
      sensitivity = 'standard'
      or (sensitivity = 'sensitive' and app_user_role(circle_id) in ('owner','family_admin','family','caregiver','care_recipient','clinician'))
      or (sensitivity = 'restricted' and app_user_role(circle_id) in ('owner','family_admin','family'))
    )
  );
--> statement-breakpoint
create policy rag_chunk_insert on "rag_chunk" for insert
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) <> 'read_only'
  );
--> statement-breakpoint
create policy rag_chunk_update on "rag_chunk" for update
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) <> 'read_only'
  )
  with check (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) <> 'read_only'
  );
--> statement-breakpoint
create policy rag_chunk_delete on "rag_chunk" for delete
  using (
    circle_id in (select app_user_circle_ids())
    and app_user_role(circle_id) <> 'read_only'
  );
--> statement-breakpoint

-- Privileges for the least-privilege app role (guarded; db:setup-rls re-grants either way).
do $$
begin
  if exists (select from pg_roles where rolname = 'carecircle_app') then
    grant select, insert, update, delete on "rag_chunk" to carecircle_app;
  end if;
end
$$;
