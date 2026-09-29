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

## Database

- Schema lives in `src/db/schema.ts`; migrations in `drizzle/`.
- Change the schema, then `npm run db:generate` and `npm run db:migrate`.
- Migrations use `DATABASE_URL_UNPOOLED` (direct); the app uses `DATABASE_URL` (pooled).
- Neon branches: `production` (deployed app) and `dev` (local work, never expires).
- `npm run db:studio` opens Drizzle Studio to browse data.
