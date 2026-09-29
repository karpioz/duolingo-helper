import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Direction of a single question. */
export const directionEnum = pgEnum("direction", ["source_to_target", "target_to_source"]);
/** Exam direction: a fixed direction, or mixed per question. */
export const examDirectionEnum = pgEnum("exam_direction", ["source_to_target", "target_to_source", "mixed"]);
export const examModeEnum = pgEnum("exam_mode", ["typed", "choice", "match"]);
/** Which words an exam draws from. */
export const examSourceEnum = pgEnum("exam_source", ["recent", "alphabetical", "random", "tagged", "missed", "due", "retest"]);

/**
 * A word or phrase in the learned language (e.g. Spanish "aprendiste").
 * `course` is "<learning>-<from>" (e.g. "es-en") so other languages can be added later.
 */
export const words = pgTable(
  "words",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    course: text().notNull().default("es-en"),
    text: text().notNull(),
    audioUrl: text("audio_url"),
    /** Position in Duolingo's "recently learned" order at last import (0 = most recent). */
    duoRank: integer("duo_rank"),
    source: text().notNull().default("duolingo"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("words_course_text_uq").on(t.course, t.text),
    index("words_course_rank_idx").on(t.course, t.duoRank),
  ],
);

/** Accepted translations of a word; any of them counts as a correct answer. */
export const translations = pgTable(
  "translations",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    text: text().notNull(),
    /** Order as given by the source; 0 is the primary translation. */
    position: smallint().notNull().default(0),
  },
  (t) => [
    uniqueIndex("translations_word_text_uq").on(t.wordId, t.text),
    index("translations_text_idx").on(t.text),
  ],
);

export const tags = pgTable("tags", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
  color: text(),
  /** Built-in tags ("hard", "forgot") can't be deleted from the UI. */
  system: boolean().notNull().default(false),
  createdAt: createdAt(),
});

export const wordTags = pgTable(
  "word_tags",
  {
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.wordId, t.tagId] }), index("word_tags_tag_idx").on(t.tagId)],
);

/**
 * Spaced-repetition state per word and direction.
 * `card` holds the full ts-fsrs Card; `due` and `state` are copied out for querying.
 */
export const reviewStates = pgTable(
  "review_states",
  {
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    direction: directionEnum().notNull(),
    due: timestamp({ withTimezone: true }).notNull(),
    state: smallint().notNull().default(0),
    card: jsonb().notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.wordId, t.direction] }), index("review_states_due_idx").on(t.due)],
);

export const examSessions = pgTable(
  "exam_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    course: text().notNull().default("es-en"),
    mode: examModeEnum().notNull(),
    direction: examDirectionEnum().notNull(),
    source: examSourceEnum().notNull(),
    /** Extra selection options, e.g. { tagIds: [1] }. */
    options: jsonb().notNull().default(sql`'{}'::jsonb`),
    size: integer().notNull(),
    correct: integer().notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("exam_sessions_started_idx").on(t.startedAt)],
);

export const examAnswers = pgTable(
  "exam_answers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => examSessions.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    direction: directionEnum().notNull(),
    given: text(),
    isCorrect: boolean("is_correct").notNull(),
    /** Accepted with a typo or missing accent in lenient mode. */
    isAlmost: boolean("is_almost").notNull().default(false),
    responseMs: integer("response_ms"),
    createdAt: createdAt(),
  },
  (t) => [
    index("exam_answers_session_idx").on(t.sessionId),
    index("exam_answers_word_idx").on(t.wordId, t.createdAt),
  ],
);

export type Word = typeof words.$inferSelect;
export type Translation = typeof translations.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ExamSession = typeof examSessions.$inferSelect;
export type ExamAnswer = typeof examAnswers.$inferSelect;
