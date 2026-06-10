CREATE TABLE "health_alert_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"metric" "observation_metric" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"min" double precision NOT NULL,
	"max" double precision NOT NULL,
	"dia_min" double precision,
	"dia_max" double precision,
	"updated_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "health_alert_setting_circle_metric_uq" UNIQUE("circle_id","metric")
);
--> statement-breakpoint
ALTER TABLE "health_alert_setting" ADD CONSTRAINT "health_alert_setting_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_alert_setting" ADD CONSTRAINT "health_alert_setting_updated_by_membership_id_membership_id_fk" FOREIGN KEY ("updated_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;