CREATE TYPE "public"."med_attachment_kind" AS ENUM('image', 'document');--> statement-breakpoint
CREATE TABLE "medication_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"kind" "med_attachment_kind" NOT NULL,
	"s3_key" text NOT NULL,
	"file_name" text,
	"content_type" text,
	"size_bytes" integer,
	"uploaded_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "medication_attachment" ADD CONSTRAINT "medication_attachment_circle_id_care_circle_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."care_circle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_attachment" ADD CONSTRAINT "medication_attachment_medication_id_medication_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_attachment" ADD CONSTRAINT "medication_attachment_uploaded_by_membership_id_membership_id_fk" FOREIGN KEY ("uploaded_by_membership_id") REFERENCES "public"."membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medication_attachment_med_idx" ON "medication_attachment" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "medication_attachment_circle_idx" ON "medication_attachment" USING btree ("circle_id");