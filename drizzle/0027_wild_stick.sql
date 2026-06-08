CREATE TYPE "public"."ask_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "ask_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ask_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"circle_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "ask_role" NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ask_conversation" ADD CONSTRAINT "ask_conversation_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_conversation" ADD CONSTRAINT "ask_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_message" ADD CONSTRAINT "ask_message_conversation_id_ask_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ask_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_message" ADD CONSTRAINT "ask_message_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_message" ADD CONSTRAINT "ask_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ask_conversation_circle_user_idx" ON "ask_conversation" USING btree ("circle_id","user_id","updated_at");--> statement-breakpoint
CREATE INDEX "ask_message_conversation_idx" ON "ask_message" USING btree ("conversation_id","created_at");