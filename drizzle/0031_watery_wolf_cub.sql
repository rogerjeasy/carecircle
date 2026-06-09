ALTER TABLE "care_circle" ADD COLUMN "digest_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "care_circle" ADD COLUMN "digest_hour" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "care_circle" ADD COLUMN "last_digest_sent_date" date;--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "notify_digest" boolean DEFAULT true NOT NULL;