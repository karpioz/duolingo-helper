CREATE TYPE "public"."direction" AS ENUM('source_to_target', 'target_to_source');--> statement-breakpoint
CREATE TYPE "public"."exam_direction" AS ENUM('source_to_target', 'target_to_source', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."exam_mode" AS ENUM('typed', 'choice', 'match');--> statement-breakpoint
CREATE TYPE "public"."exam_source" AS ENUM('recent', 'alphabetical', 'random', 'tagged', 'missed', 'due');--> statement-breakpoint
CREATE TABLE "exam_answers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exam_answers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"direction" "direction" NOT NULL,
	"given" text,
	"is_correct" boolean NOT NULL,
	"is_almost" boolean DEFAULT false NOT NULL,
	"response_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exam_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"course" text DEFAULT 'es-en' NOT NULL,
	"mode" "exam_mode" NOT NULL,
	"direction" "exam_direction" NOT NULL,
	"source" "exam_source" NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"size" integer NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "review_states" (
	"word_id" integer NOT NULL,
	"direction" "direction" NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"state" smallint DEFAULT 0 NOT NULL,
	"card" jsonb NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"wrong_count" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_states_word_id_direction_pk" PRIMARY KEY("word_id","direction")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"color" text,
	"system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "translations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"word_id" integer NOT NULL,
	"text" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_tags" (
	"word_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "word_tags_word_id_tag_id_pk" PRIMARY KEY("word_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "words_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"course" text DEFAULT 'es-en' NOT NULL,
	"text" text NOT NULL,
	"audio_url" text,
	"duo_rank" integer,
	"source" text DEFAULT 'duolingo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_session_id_exam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."exam_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_states" ADD CONSTRAINT "review_states_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_tags" ADD CONSTRAINT "word_tags_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_tags" ADD CONSTRAINT "word_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_answers_session_idx" ON "exam_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "exam_answers_word_idx" ON "exam_answers" USING btree ("word_id","created_at");--> statement-breakpoint
CREATE INDEX "exam_sessions_started_idx" ON "exam_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "review_states_due_idx" ON "review_states" USING btree ("due");--> statement-breakpoint
CREATE UNIQUE INDEX "translations_word_text_uq" ON "translations" USING btree ("word_id","text");--> statement-breakpoint
CREATE INDEX "translations_text_idx" ON "translations" USING btree ("text");--> statement-breakpoint
CREATE INDEX "word_tags_tag_idx" ON "word_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "words_course_text_uq" ON "words" USING btree ("course","text");--> statement-breakpoint
CREATE INDEX "words_course_rank_idx" ON "words" USING btree ("course","duo_rank");