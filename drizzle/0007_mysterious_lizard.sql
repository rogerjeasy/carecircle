CREATE TABLE "platform_auth_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"provider" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "platform_auth_audit_time_idx" ON "platform_auth_audit" USING btree ("occurred_at");