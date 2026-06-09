-- Defensive: an earlier attempt at this migration failed on a name collision (the feedback enum
-- was once named "digest_feedback", clashing with the digest_feedback TABLE). Drop any partial
-- leftovers so this applies cleanly whether the prior attempt rolled back or not — no digest data
-- exists yet, so this is safe and a no-op on a clean database.
DROP TYPE IF EXISTS "public"."digest_feedback" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."digest_feedback_value" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."digest_mood" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."digest_feedback_value" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TYPE "public"."digest_mood" AS ENUM('great', 'good', 'okay', 'low');--> statement-breakpoint
CREATE TABLE "daily_digest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"digest_date" date NOT NULL,
	"headline" text NOT NULL,
	"emoji" text NOT NULL,
	"mood" "digest_mood" NOT NULL,
	"paragraphs" jsonb NOT NULL,
	"stats" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"model" text,
	"generated_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "daily_digest_circle_date_uq" UNIQUE("circle_id","digest_date")
);
--> statement-breakpoint
CREATE TABLE "digest_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest_id" uuid NOT NULL,
	"circle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"value" "digest_feedback_value" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digest_feedback_digest_user_uq" UNIQUE("digest_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "daily_digest" ADD CONSTRAINT "daily_digest_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_digest" ADD CONSTRAINT "daily_digest_generated_by_membership_id_membership_id_fk" FOREIGN KEY ("generated_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_feedback" ADD CONSTRAINT "digest_feedback_digest_id_daily_digest_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."daily_digest"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_feedback" ADD CONSTRAINT "digest_feedback_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_feedback" ADD CONSTRAINT "digest_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_digest_circle_date_idx" ON "daily_digest" USING btree ("circle_id","digest_date");