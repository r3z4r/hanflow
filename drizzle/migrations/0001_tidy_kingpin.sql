CREATE TABLE "parse_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"sentence_hash" text NOT NULL,
	"sentence_text" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parse_feedback" ADD CONSTRAINT "parse_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parse_feedback_hash_idx" ON "parse_feedback" USING btree ("sentence_hash");