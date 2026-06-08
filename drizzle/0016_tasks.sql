CREATE TYPE "public"."task_category" AS ENUM('errand', 'medical', 'admin', 'refill', 'visit');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'doing', 'done');--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"category" "task_category" DEFAULT 'errand' NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"assigned_to_membership_id" uuid,
	"due_at" timestamp with time zone,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by_membership_id" uuid,
	"created_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assigned_to_membership_id_membership_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_completed_by_membership_id_membership_id_fk" FOREIGN KEY ("completed_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_membership_id_membership_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_circle_status_order_idx" ON "task" USING btree ("circle_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "task_circle_idx" ON "task" USING btree ("circle_id");