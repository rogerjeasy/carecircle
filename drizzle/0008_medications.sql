CREATE TYPE "public"."dose_status" AS ENUM('given', 'taken', 'skipped', 'refused', 'missed');--> statement-breakpoint
CREATE TYPE "public"."med_form" AS ENUM('tablet', 'capsule', 'liquid', 'injection', 'patch', 'inhaler', 'drops', 'cream', 'other');--> statement-breakpoint
CREATE TYPE "public"."med_route" AS ENUM('oral', 'sublingual', 'topical', 'inhaled', 'injection', 'ophthalmic', 'nasal', 'other');--> statement-breakpoint
CREATE TABLE "medication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"name" text NOT NULL,
	"strength" text,
	"form" "med_form" DEFAULT 'tablet' NOT NULL,
	"route" "med_route" DEFAULT 'oral' NOT NULL,
	"purpose" text,
	"prescriber" text,
	"instructions" text,
	"photo_s3_key" text,
	"supply_count" integer DEFAULT 0 NOT NULL,
	"refill_threshold" integer DEFAULT 7 NOT NULL,
	"is_prn" boolean DEFAULT false NOT NULL,
	"prn_max_per_day" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"discontinued_at" timestamp with time zone,
	"discontinued_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "medication_supply_nonneg" CHECK ("medication"."supply_count" >= 0),
	CONSTRAINT "medication_refill_nonneg" CHECK ("medication"."refill_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "medication_administration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"schedule_id" uuid,
	"scheduled_for" timestamp with time zone,
	"status" "dose_status" NOT NULL,
	"administered_at" timestamp with time zone,
	"administered_by_membership_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medication_admin_occurrence_uq" UNIQUE("schedule_id","scheduled_for")
);
--> statement-breakpoint
CREATE TABLE "medication_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"time_of_day" text NOT NULL,
	"days_of_week" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL,
	"dose_amount" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "medication" ADD CONSTRAINT "medication_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administration" ADD CONSTRAINT "medication_administration_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administration" ADD CONSTRAINT "medication_administration_medication_id_medication_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administration" ADD CONSTRAINT "medication_administration_schedule_id_medication_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."medication_schedule"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administration" ADD CONSTRAINT "medication_administration_administered_by_membership_id_membership_id_fk" FOREIGN KEY ("administered_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_schedule" ADD CONSTRAINT "medication_schedule_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_schedule" ADD CONSTRAINT "medication_schedule_medication_id_medication_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medication_circle_idx" ON "medication" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "medication_active_idx" ON "medication" USING btree ("circle_id") WHERE "medication"."deleted_at" is null and "medication"."discontinued_at" is null;--> statement-breakpoint
CREATE INDEX "medication_admin_circle_time_idx" ON "medication_administration" USING btree ("circle_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "medication_admin_med_idx" ON "medication_administration" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "medication_schedule_med_idx" ON "medication_schedule" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "medication_schedule_circle_idx" ON "medication_schedule" USING btree ("circle_id");