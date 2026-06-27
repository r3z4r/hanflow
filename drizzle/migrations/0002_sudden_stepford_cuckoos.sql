CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"doc_hash" text NOT NULL,
	"raw_input" text NOT NULL,
	"normalized_input" text NOT NULL,
	"default_mode" text NOT NULL,
	"is_favorited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_aspect" (
	"seg_hash" text NOT NULL,
	"aspect" text NOT NULL,
	"result" jsonb NOT NULL,
	"model" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "segment_aspect_seg_hash_aspect_pk" PRIMARY KEY("seg_hash","aspect")
);
--> statement-breakpoint
CREATE TABLE "segment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"seg_hash" text NOT NULL,
	"segment_text" text NOT NULL,
	"unit_type" text NOT NULL,
	"ordinal" integer NOT NULL,
	"is_favorited" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_user_id_idx" ON "document" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_hash_idx" ON "document" USING btree ("doc_hash");--> statement-breakpoint
CREATE INDEX "segment_document_ordinal_idx" ON "segment" USING btree ("document_id","ordinal");--> statement-breakpoint
CREATE INDEX "segment_hash_idx" ON "segment" USING btree ("seg_hash");