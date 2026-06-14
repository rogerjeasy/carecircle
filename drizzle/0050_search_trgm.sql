-- ============================================================================
-- Kintwadi — Global search: pg_trgm extension + GIN trigram indexes
-- ----------------------------------------------------------------------------
-- Powers the top-bar command-palette search. Runs as the OWNER/migration connection
-- (MIGRATION_DATABASE_URL), which on Aurora may CREATE EXTENSION — same as 0025 (pgvector).
--
-- The search itself runs through withAuthedDb() (RLS), so these indexes only make the
-- ILIKE '%q%' + similarity() lookups fast; they grant NO new visibility. Idempotent.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

-- One GIN trigram index per searched text column (accelerates ILIKE and similarity()).
CREATE INDEX IF NOT EXISTS "medication_name_trgm" ON "medication" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_title_trgm" ON "document" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_title_trgm" ON "task" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_title_trgm" ON "appointment" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "timeline_event_summary_trgm" ON "timeline_event" USING gin ("summary" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_description_trgm" ON "incident" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "care_recipient_profile_full_name_trgm" ON "care_recipient_profile" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_name_trgm" ON "user" USING gin ("name" gin_trgm_ops);
