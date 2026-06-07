CREATE TABLE "timeline_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"timeline_event_id" uuid NOT NULL,
	"author_membership_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "timeline_reaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"timeline_event_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timeline_reaction_event_member_uq" UNIQUE("timeline_event_id","membership_id")
);
--> statement-breakpoint
ALTER TABLE "timeline_comment" ADD CONSTRAINT "timeline_comment_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_comment" ADD CONSTRAINT "timeline_comment_timeline_event_id_timeline_event_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."timeline_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_comment" ADD CONSTRAINT "timeline_comment_author_membership_id_membership_id_fk" FOREIGN KEY ("author_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_reaction" ADD CONSTRAINT "timeline_reaction_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_reaction" ADD CONSTRAINT "timeline_reaction_timeline_event_id_timeline_event_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."timeline_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_reaction" ADD CONSTRAINT "timeline_reaction_membership_id_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "timeline_comment_event_idx" ON "timeline_comment" USING btree ("timeline_event_id");--> statement-breakpoint
CREATE INDEX "timeline_comment_circle_idx" ON "timeline_comment" USING btree ("circle_id");--> statement-breakpoint
CREATE INDEX "timeline_reaction_event_idx" ON "timeline_reaction" USING btree ("timeline_event_id");