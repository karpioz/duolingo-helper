# Scaffold and database schema (step 1)

## Summary

Next.js app scaffolded, database schema created on the Neon `dev` branch, and a home page showing
live counts from the database. Typecheck, lint and production build pass.

## Implementation

- **App:** Next.js 16.3.7, React 19.2, TypeScript, Tailwind v4, React Compiler, `src/` dir.
  Scaffolded in a scratch folder and copied in, because `create-next-app` won't run in a
  non-empty folder. Merged `package.json` and `.gitignore` with the Neon files.
- **UI:** shadcn/ui (`base-nova` style, Base UI primitives, lucide icons); components so far:
  button, card, badge, input.
- **Database access** (`src/db/index.ts`): Drizzle ORM over `pg` (node-postgres) with the pooled
  `DATABASE_URL`, one pool reused across hot reloads, `attachDatabasePool` from `@vercel/functions`.
- **Migrations** (`drizzle.config.ts`): drizzle-kit with the direct `DATABASE_URL_UNPOOLED`.
  - `0000_init`: all tables and enums.
  - `0001_extensions_and_system_tags` (custom SQL): `unaccent`, `pg_trgm`, tags "hard" and "forgot".
- **Scripts:** `db:generate`, `db:migrate`, `db:studio`, `typecheck` (`next typegen && tsc --noEmit`).

## Schema

| Table | Purpose |
|---|---|
| `words` | A word or phrase; `course` (`es-en`), `text`, `audio_url`, `duo_rank` (0 = most recently learned). Unique per course + text. |
| `translations` | Accepted answers per word, with `position` (0 = primary). |
| `tags`, `word_tags` | Tags; `system` marks built-in ones. |
| `review_states` | Spaced-repetition state per word **and** direction. `card` is the full ts-fsrs card (jsonb); `due` and `state` are copied into columns for querying. |
| `exam_sessions` | One test: mode (typed / choice / match), direction, word source, size, score. |
| `exam_answers` | Each answer given: text, correct, "almost" (lenient match), response time. |

## Decisions

- **Driver:** `pg` + `attachDatabasePool`, per Neon's guidance for Vercel (Fluid compute), rather
  than `@neondatabase/serverless`.
- **Directions are generic** (`source_to_target` / `target_to_source`), not `es_en`, so other
  courses work without schema changes.
- **FSRS card stored as jsonb:** ts-fsrs is deprecating fields (e.g. `elapsed_days` in v6), so
  the library's shape isn't mirrored in columns.
- **Ids** use Postgres identity columns; timestamps are `timestamptz`.

## Gotchas

- `LayoutProps` / `PageProps` are generated types: plain `tsc --noEmit` fails until
  `next typegen` has run, so the `typecheck` script runs both.
- Pages that query the database call `await connection()` (`next/server`), so Next doesn't try to
  prerender them (and hit the database) at build time.
- node-postgres warns that `sslmode=require` is treated as `verify-full`. `src/db/url.ts`
  (`pgUrl`) rewrites it to `verify-full` explicitly: same behaviour, no warning.
- shadcn's `base-nova` components import `cn` from the `cn` npm package, not `@/lib/utils`.
- npm blocked the post-install scripts of `esbuild` and `unrs-resolver`; drizzle-kit, lint and the
  build all work regardless.
- `AGENTS.md` (from create-next-app) says Next 16 differs from older versions; check
  `node_modules/next/dist/docs/` before using unfamiliar APIs.

## Next

Step 2: `git init`, push to `github.com/karpioz/duolingo-helper`. Then the Duolingo importer.
