CREATE TYPE "public"."incident_ack" AS ENUM('pending', 'seen', 'acknowledged');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('fall', 'hospitalization', 'emergency', 'other');--> statement-breakpoint
CREATE TABLE "incident" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"type" "incident_type" NOT NULL,
	"severity" "incident_severity" DEFAULT 'low' NOT NULL,
	"description" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" "incident_status" DEFAULT 'open' NOT NULL,
	"photo_s3_key" text,
	"reported_by_membership_id" uuid,
	"timeline_event_id" uuid,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"resolved_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "incident_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"author_membership_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "incident_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"status" "incident_ack" DEFAULT 'pending' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_notification_incident_member_uq" UNIQUE("incident_id","membership_id")
);
--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_reported_by_membership_id_membership_id_fk" FOREIGN KEY ("reported_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_timeline_event_id_timeline_event_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."timeline_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident" ADD CONSTRAINT "incident_resolved_by_membership_id_membership_id_fk" FOREIGN KEY ("resolved_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_comment" ADD CONSTRAINT "incident_comment_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_comment" ADD CONSTRAINT "incident_comment_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_comment" ADD CONSTRAINT "incident_comment_author_membership_id_membership_id_fk" FOREIGN KEY ("author_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_notification" ADD CONSTRAINT "incident_notification_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_notification" ADD CONSTRAINT "incident_notification_incident_id_incident_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incident"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_notification" ADD CONSTRAINT "incident_notification_membership_id_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incident_circle_time_idx" ON "incident" USING btree ("circle_id","occurred_at");--> statement-breakpoint
CREATE INDEX "incident_circle_status_idx" ON "incident" USING btree ("circle_id","status");--> statement-breakpoint
CREATE INDEX "incident_comment_incident_idx" ON "incident_comment" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "incident_comment_circle_idx" ON "incident_comment" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "incident_notification_incident_idx" ON "incident_notification" USING btree ("incident_id");