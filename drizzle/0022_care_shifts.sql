CREATE TYPE "public"."shift_type" AS ENUM('in-person', 'on-call');--> statement-breakpoint
CREATE TABLE "care_shift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"assigned_to_membership_id" uuid,
	"day_index" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"shift_type" "shift_type" DEFAULT 'in-person' NOT NULL,
	"created_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "care_shift" ADD CONSTRAINT "care_shift_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_shift" ADD CONSTRAINT "care_shift_assigned_to_membership_id_membership_id_fk" FOREIGN KEY ("assigned_to_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_shift" ADD CONSTRAINT "care_shift_created_by_membership_id_membership_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_shift_circle_day_idx" ON "care_shift" USING btree ("circle_id","day_index");