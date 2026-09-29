# Spaced repetition (step 7)

## Summary

Every answer is now a spaced-repetition review (FSRS via `ts-fsrs`), tracked per word **and**
direction. You see it in:

- **Setup:** a "Due for review" source (most overdue first, in the due direction), preselected
  when something is due or via `/test?source=due`.
- **Home:** a "N words due for review → Review now" banner.
- **Typed test feedback:** "Next review in 3 d".
- **Word list:** "Due now" / "Review in 3 d".
- **Analytics:** 14-day review forecast (today includes overdue) and a "Review N due words now"
  button.

History recorded before this step was replayed into schedules (88 answers → 64 cards).
Tested in Chrome: due test (correct → 3 d, typo → 2 d, wrong → 1 d); a match board updates reviews
too.

## Implementation

- `src/lib/srs.ts` (pure, 6 vitest tests): `scheduler`, `gradeFor`, `reviewCard`, `formatDue`.
  - Grades: wrong → Again, almost → Hard, correct → Good. Match: never part of a wrong pair →
    Good, else Again.
  - The full ts-fsrs card lives in `review_states.card` (jsonb); `TypeConvert.card` restores its
    dates. `due` and `state` are columns for querying.
- `src/server/review.ts`: `applyReview` (`SELECT … FOR UPDATE` then upsert, inside the answer's
  transaction), `dueCounts`, `reviewForecast`.
- Hooked into `recordAnswer` (returns `nextDue`) and `recordMatchBoard`.
- **Due source:** `dueWords` = `DISTINCT ON (word_id)` over due review states (optionally one
  direction), ordered by due. Typed questions use the direction that's due; match boards still
  pick one direction per board.
- **`npm run srs:rebuild`** (`dev/scripts/rebuild-review-states.ts`): deletes all review states
  and replays `exam_answers` in order. It runs with `tsx --conditions=react-server`, because
  `src/db` imports `server-only`, which throws outside the react-server condition. `src/db` now
  also exports `pool` so the script can close it.

## Decisions

- **No short-term learning steps** (`enable_short_term: false`). With the default 1–10 minute
  steps, every word from a finished test was "due now" minutes later (55 reviews due right after
  the replay). These words were already learned on Duolingo; same-day practice is what
  "Retest missed" and "Missed last time" are for.
- **A wrong answer is always due tomorrow.** Without short-term steps, FSRS put a lapse of a
  well-known word 6 days out, which is too long for a word you just forgot. `reviewCard` caps
  `due` at +1 day for Again and leaves FSRS's stability untouched.
- **Fuzz on, max interval 365 days.** Fuzz stops words learned together from all coming due on
  the same day.
- **Separate schedules per direction:** recognising *aprendiste* and producing it are different
  skills.

## Gotchas

- **Alias vs Drizzle column in raw SQL:** `${reviewStates.direction}` renders as
  `"review_states"."direction"`, which Postgres rejects when the table is aliased
  (`from review_states rs`; error 42P01). In aliased raw SQL, write the alias (`rs.direction`).
- **node-postgres returns `date` columns as local-midnight `Date`s**, so `toISOString()` shows the
  previous day in BST. For day buckets, format in SQL (`to_char`), as `stats.ts` does.
- **Relative times (`formatDue`) are computed on the server or in event handlers**, not during
  a client render: React's purity rules forbid `Date.now()` in render.

## Next

Multiple choice; deploy (Vercel + Neon production + auth).
