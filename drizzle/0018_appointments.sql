CREATE TYPE "public"."appt_kind" AS ENUM('checkup', 'specialist', 'lab', 'imaging', 'therapy', 'dental', 'other');--> statement-breakpoint
CREATE TYPE "public"."appt_status" AS ENUM('scheduled', 'confirmed', 'needs-prep', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" "appt_kind" DEFAULT 'other' NOT NULL,
	"provider" text,
	"location" text,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"assigned_to_membership_id" uuid,
	"status" "appt_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"prep" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visit_summary" text,
	"posted_to_timeline" boolean DEFAULT false NOT NULL,
	"created_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_assigned_to_membership_id_membership_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_created_by_membership_id_membership_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_circle_start_idx" ON "appointment" USING btree ("circle_id","starts_at");