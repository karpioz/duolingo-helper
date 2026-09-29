# Duolingo Helper

Practise the Spanish words you've learned on Duolingo: typed and multiple-choice tests in both
directions, match pairs, tags for hard words, and spaced repetition.

**Stack:** Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · Drizzle ORM · Neon Postgres · ts-fsrs

## Setup

```bash
npm install
neon login                 # once per machine
neon checkout dev          # point .env.local at the Neon dev branch
npm run db:migrate         # apply migrations
npm run dev
```

## Importing words from Duolingo

1. Run the app locally (`npm run dev`, port 3000).
2. Open https://www.duolingo.com/practice-hub/words (signed in), reload it, and paste
   `src/importers/duolingo/browser-script.js` into the browser console.
3. Click the green **Send N words to Duolingo Helper** button. It opens `/import`, which saves them.

Re-importing is safe: existing words are updated (audio, order, translations) and keep their tags
and review history. Import is disabled in production until sign-in is added.

## Database

- Schema lives in `src/db/schema.ts`; migrations in `drizzle/`.
- Change the schema, then `npm run db:generate` and `npm run db:migrate`.
- Migrations use `DATABASE_URL_UNPOOLED` (direct); the app uses `DATABASE_URL` (pooled).
- Neon branches: `production` (deployed app) and `dev` (local work, never expires).
- `npm run db:studio` opens Drizzle Studio to browse data.
