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

## Sign-in

Neon Auth (Managed Better Auth), email + password. The app is private: only addresses in
`ALLOWED_EMAILS` (comma-separated) can create an account or use it. Every page, server action and
API route checks the session. `.env.local` also needs `NEON_AUTH_COOKIE_SECRET` (32+ random
characters) — `neon env pull` does not create it.

## Deployment (Vercel)

- Pushing to `main` deploys to production (Vercel project `duolingo-helper`, linked to this repo).
- Production uses the Neon `production` branch; env vars are set in Vercel (Production only):
  `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`,
  `ALLOWED_EMAILS`, `NEON_BRANCH`.
- `vercel-build` runs `db:migrate` against production before `next build`, so schema changes ship
  with the code.
- Neon Auth only redirects to trusted origins: `neon neon-auth domain add https://<domain> --branch production`.

## Importing words from Duolingo

1. Sign in to the app (locally on port 3000, or the deployed site — set `window.DUOLINGO_HELPER_URL`
   to the site URL before running the script).
2. Open https://www.duolingo.com/practice-hub/words (signed in), reload it, and paste
   `src/importers/duolingo/browser-script.js` into the browser console.
3. Click the green **Send N words to Duolingo Helper** button. It opens `/import`, which saves them.

Re-importing is safe: existing words are updated (audio, order, translations) and keep their tags
and review history.

## Database

- Schema lives in `src/db/schema.ts`; migrations in `drizzle/`.
- Change the schema, then `npm run db:generate` and `npm run db:migrate`.
- Migrations use `DATABASE_URL_UNPOOLED` (direct); the app uses `DATABASE_URL` (pooled).
- Neon branches: `production` (deployed app) and `dev` (local work, never expires).
- `npm run db:studio` opens Drizzle Studio to browse data.

## Spaced repetition

Every answer (typed or match) is an FSRS review of that word in that direction: wrong → back
tomorrow, typo/missing accent → *Hard*, correct → *Good*. `npm run srs:rebuild` replays all answers
to rebuild the schedule (run it after changing the scheduler settings in `src/lib/srs.ts`).
