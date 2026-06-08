CREATE TYPE "public"."doc_category" AS ENUM('medical', 'insurance', 'legal', 'financial', 'id', 'advance-directive');--> statement-breakpoint
CREATE TYPE "public"."doc_kind" AS ENUM('pdf', 'image', 'doc');--> statement-breakpoint
CREATE TYPE "public"."doc_sensitivity" AS ENUM('standard', 'sensitive', 'restricted');--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" "doc_category" NOT NULL,
	"sensitivity" "doc_sensitivity" DEFAULT 'standard' NOT NULL,
	"kind" "doc_kind" NOT NULL,
	"s3_key" text NOT NULL,
	"content_type" text,
	"file_name" text,
	"size_bytes" integer,
	"expires_at" timestamp with time zone,
	"is_emergency_visible" boolean DEFAULT false NOT NULL,
	"uploaded_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_membership_id_membership_id_fk" FOREIGN KEY ("uploaded_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_circle_idx" ON "document" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "document_circle_category_idx" ON "document" USING btree ("circle_id","category");--> statement-breakpoint
CREATE INDEX "document_circle_sensitivity_idx" ON "document" USING btree ("circle_id","sensitivity") WHERE "document"."deleted_at" is null;