ALTER TYPE "public"."exam_source" ADD VALUE 'personal';--> statement-breakpoint
CREATE TABLE "personal_test_words" (
	"test_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "personal_test_words_test_id_word_id_pk" PRIMARY KEY("test_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "personal_tests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "personal_tests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"course" text DEFAULT 'es-en' NOT NULL,
	"name" text NOT NULL,
	"mode" "exam_mode" DEFAULT 'typed' NOT NULL,
	"direction" "exam_direction" DEFAULT 'source_to_target' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_test_words" ADD CONSTRAINT "personal_test_words_test_id_personal_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."personal_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_test_words" ADD CONSTRAINT "personal_test_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "personal_test_words_word_idx" ON "personal_test_words" USING btree ("word_id");