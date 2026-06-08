-- pgvector: required for the `vector` column type + HNSW index below. Runs as the migration
-- (admin/owner) connection, which on Aurora may CREATE EXTENSION. Idempotent.
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."rag_source" AS ENUM('document', 'timeline', 'audit');--> statement-breakpoint
CREATE TABLE "rag_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"source" "rag_source" NOT NULL,
	"source_id" uuid NOT NULL,
	"sensitivity" "doc_sensitivity" DEFAULT 'standard' NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_count" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"source_created_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "rag_chunk_source_uq" UNIQUE("source","source_id","chunk_index")
);
--> statement-breakpoint
ALTER TABLE "rag_chunk" ADD CONSTRAINT "rag_chunk_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rag_chunk_circle_idx" ON "rag_chunk" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "rag_chunk_circle_source_idx" ON "rag_chunk" USING btree ("circle_id","source","source_id");--> statement-breakpoint
CREATE INDEX "rag_chunk_embedding_hnsw_idx" ON "rag_chunk" USING hnsw ("embedding" vector_cosine_ops);