CREATE TYPE "public"."observation_metric" AS ENUM('bp', 'glucose', 'weight', 'sleep', 'mood', 'hr');--> statement-breakpoint
CREATE TABLE "observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"metric" "observation_metric" NOT NULL,
	"value" double precision NOT NULL,
	"secondary" double precision,
	"recorded_at" timestamp with time zone NOT NULL,
	"note" text,
	"recorded_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_recorded_by_membership_id_membership_id_fk" FOREIGN KEY ("recorded_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observation_circle_metric_time_idx" ON "observation" USING btree ("circle_id","metric","recorded_at");