CREATE TABLE "service_status" (
	"name" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"metric" text DEFAULT '' NOT NULL,
	"since" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_alert_recipient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "status_alert_recipient_email_uq" ON "status_alert_recipient" USING btree (lower("email"));