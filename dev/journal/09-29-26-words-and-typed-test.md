# Word list and typed test (step 4)

## Summary

The core practice loop works end to end: browse and tag words, set up a test, answer typed
questions in either direction, see results, retest what you missed. Tested in Chrome with three
real tests (ES→EN 2/10, a retest, EN→ES 10/10 using unaccented answers).

## Pages

| Route | What it does |
|---|---|
| `/` | Stats (words, translations, tag counts, missed last time), recent tests, "Test me" / "Browse words". |
| `/words` | Search (Spanish or English, accent-insensitive), sort recent / A–Z, filter by tag, 100 per page, audio, tag toggles, ✓/✗ counts. Plain GET form, no client JS needed. |
| `/test` | Setup: 10 / 20 / custom (1–200); source (recent, alphabetical + start letter, random, tagged, missed last time); direction (ES→EN, EN→ES, mixed); lenient checking. |
| `/test/[id]` | Typed test: progress, audio, accent buttons (EN→ES), "I don't know", feedback with all translations, tag toggles (keys **H** / **F**), Enter for next. Resumes where you left off. |
| `/test/[id]/results` | Score, every answer (✓ / ~ almost / ✗, what you wrote), tag toggles, "Retest N missed", "New test". |

## Implementation

- **Answer checking** (`src/lib/answers.ts`, 12 vitest tests):
  - Case, punctuation and brackets are ignored: "(you) learned" accepts "you learned" and "learned";
    "(?)" just marks a question.
  - A leading "to", "the", "a" / "el", "la", "un"… is optional on either side.
  - Lenient mode: missing accents (incl. ñ → n) are "almost"; so are typos: 1 edit from 4 letters,
    2 from 9, none below 4. "Almost" counts as correct and is stored as `is_almost`.
- **EN→ES alternatives** (`alternativeWords` in `src/server/exams.ts`): another word is also
  accepted if its translations include *every* translation of the asked word. E.g. "woman" →
  *mujer*, but *señora* is accepted too, with a note that the card was *mujer*. 230 of 1,223 words
  have at least one alternative.
- **Exams:** `createExam` picks words, shuffles them, fixes each question's direction (mixed =
  random per question) and stores the list in `exam_sessions.options.questions` (jsonb, no new
  table). Answers must arrive in order (`index === answers so far`), so a reload resumes safely.
- **Checking happens on the server** (`submitAnswer` server action → `recordAnswer`). One round
  trip per answer; no answers are sent to the browser ahead of time.
- **Retest** is a new exam source (`retest`, migration `0002`) with explicit `wordIds`.
- **"Missed last time"** = words whose most recent answer (any direction) was wrong, via
  `DISTINCT ON (word_id)` over `exam_answers`.
- New UI components: label, switch, progress, toggle(-group), separator; `AudioButton`,
  `TagToggle`, `SiteHeader`.

## Decisions

- **Typed answers only for now**; multiple choice and match pairs come next.
- **Spaced repetition not wired yet**: `review_states` stays empty until the FSRS step;
  `exam_answers` already has what "missed" and the ✓/✗ counts need.
- **Tag shortcuts use the tag's first letter** (H = hard, F = forgot), only while feedback is
  shown so they never clash with typing.
- **`@types/node` bumped to ^22** to match the installed Node (v22) and satisfy vitest 5's
  peer dependency.

## Gotchas

- **Drizzle drops the table name in single-table selects.** A correlated subquery written as
  `where t.word_id = ${words.id}` rendered as `t.word_id = "id"`, which bound to the *subquery's*
  table. Translations came back empty with no error. Fixed with `WORD_ID = sql.raw('"words"."id"')`
  (`src/server/words.ts`); use it in every subquery that refers to the outer word.
- **Drizzle throws "No values to set" on an empty `.set({})`**: a wrong answer on a non-final
  question has nothing to update on the session. Guard the update.
- **Next 16 route types** (`PageProps<"/words">`, `LayoutProps`) exist only after
  `next typegen`; the editor shows false errors for new routes until then.
- **Base UI `Button`** rendering a `Link` needs `nativeButton={false}` (again).
- **Browser testing:** Chrome won't capture screenshots, and simulated typing doesn't arrive,
  while the tab is in the background. Drive the page with injected scripts instead.

## Next

Multiple choice and match pairs; spaced repetition (ts-fsrs) with a "due for review" source.
