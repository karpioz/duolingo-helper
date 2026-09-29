# Project plan and stack

## Summary

A local-first helper for practising the Spanish words learned on Duolingo (1,223 words at the
start), deployable later and able to grow into grammar rules and other content.

## Features planned

- **Test me:** 10 / 20 / custom number of words.
  - Word selection: recently learned, alphabetical, random, tagged, missed last time, due for review.
  - Direction: Spanish → English, English → Spanish, or mixed.
  - Answer type: typed, or multiple choice.
- **Answer checking:** any listed translation is accepted ("(you) learned" = "you learned" = "learned");
  optional lenient mode for missing accents and one-letter typos; accent buttons for typing Spanish.
- **Match pairs:** 5 Spanish tiles against 5 English tiles, either side on the left.
- **Tags:** "hard" and "forgot" built in, plus custom tags; retest the words you missed.
- **Spaced repetition:** missed words come back sooner.
- **Audio:** Duolingo's recordings.

## Decisions

- **Next.js + TypeScript**: one codebase for UI and server, easy to deploy on Vercel.
- **Tailwind + shadcn/ui** for the UI.
- **Database: Neon Postgres + Drizzle ORM.**
  - Considered SQLite/Turso (first proposal), Firebase and Neon.
  - Firebase rejected: the data is relational (words ↔ translations ↔ tags ↔ reviews ↔ exams);
    Firestore has no joins and weak multi-field queries.
  - Neon chosen over SQLite/Turso for Postgres features the app needs: `unaccent`
    (accent-insensitive answers), `pg_trgm` (typo tolerance, search), full-text search, `jsonb`,
    `pgvector` if AI features come later. Branching gives a separate dev database.
  - Trade-off: needs internet (no offline use); cold start of a few hundred ms after idle.
- **ts-fsrs** for spaced-repetition scheduling.
- **Import via the user's logged-in Duolingo tab**, not a server-side sync (see Gotchas).

## Gotchas

- Duolingo's word list comes from an **unofficial** API:
  `POST /2017-06-30/users/<id>/courses/es/en/learned-lexemes?limit=50&sortBy=LEARNED_DATE&startIndex=N`
  - The body must include `lastTotalLexemeCount` and the user's `progressedSkills` (60 skills at
    the start). An empty `progressedSkills` returns zero words.
  - Each word: `{ text, translations[], audioURL, isNew }`; paginated via `pagination.nextStartIndex`.
  - Keep the importer isolated so it's easy to fix if Duolingo changes the API.
- **EN → ES is ambiguous:** "learn" maps to aprender, aprendo, … Accept any word whose translations
  contain the prompt, and show the expected one.
- **Match pairs:** never put words with overlapping translations on the same board.

## Build order

1. Scaffold, database schema, importer.
2. Word list, test setup, typed test in both directions, tagging, results.
3. Multiple choice, match pairs, spaced repetition.
4. Stats and history; deploy (Vercel + Neon production + Neon Auth).
