ALTER TABLE "user" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "notification_prefs" jsonb;