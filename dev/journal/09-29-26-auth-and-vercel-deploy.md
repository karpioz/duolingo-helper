# Sign-in and Vercel deployment (step 8)

## Summary

Live at **https://duolingo-helper-gamma.vercel.app**, deployed from GitHub `main` (Vercel project
`duolingo-helper`, team `pawel-karpinskis-projects`), running on the Neon `production` branch.
Private: email + password via Neon Auth, only `karpioz@gmail.com` allowed.

Verified on production:
- Signed-out pages redirect to `/auth/sign-in`.
- The import API returns 401.
- A stranger's sign-up is refused.
- The signed-in home page shows all data.

## Decisions (asked)

- **Production data:** production was restored from `dev` (`neon branches restore production dev
  --preserve-under-name production-before-restore`). Words, history, schedules and the owner's
  account carried over. The old empty production is kept as `production-before-restore`; it can
  be deleted later.
- **Sign-in:** email + password (Neon Managed Better Auth). Google would need our own OAuth app
  in production.
- **Local dev requires sign-in too**, so the auth path gets exercised every day.

## Implementation

- `src/lib/auth/server.ts`: `createNeonAuth` (`NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`).
- `src/app/api/auth/[...path]/route.ts`: `auth.handler()` (proxies to Neon Auth).
- `src/proxy.ts`: `auth.middleware` on pages only. The matcher excludes `auth`, `api` and static
  files; API routes return 401 themselves.
- `src/server/session.ts`: `ALLOWED_EMAILS` allowlist. An empty allowlist denies everyone.
  - `requireUser()` (pages): redirects to sign-in or `/auth/not-authorized`.
  - `assertUser()` (actions / API): throws.
- `src/app/(app)/`: all app pages moved into a route group whose layout calls `requireUser()` and
  renders the header (email + Sign out). URLs are unchanged.
- `src/app/auth/*`: sign-in / sign-up pages (server actions + `useActionState`) and a
  not-authorized page. Sign-up checks the allowlist **before** creating an account.
- Every server action and `/api/import/duolingo` calls `assertUser()`. The import now works on
  the live site: set `window.DUOLINGO_HELPER_URL` to the site URL before running the collector.
- **Vercel:**
  - `vercel.json` pins `framework: nextjs`.
  - The `vercel-build` script runs `db:migrate` when `VERCEL_ENV=production`, then `next build`.
  - Production env vars: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `NEON_AUTH_COOKIE_SECRET`
    are secrets; `NEON_AUTH_BASE_URL`, `ALLOWED_EMAILS` and `NEON_BRANCH` are plain config.
    The production cookie secret is separate from the local one.
- **Neon Auth trusted domains (production branch):** `duolingo-helper-gamma.vercel.app`, plus
  the team alias.

## Gotchas

- **Project created with `vercel project add` gets the "Other" preset**, so the first deploy
  failed with "No Output Directory named public". Fixed by `vercel.json` `framework: nextjs`.
- **Team URLs are behind Vercel Deployment Protection** (`*-pawel-karpinskis-projects.vercel.app`
  redirect to a Vercel login). The public production URL is the short
  `duolingo-helper-gamma.vercel.app`.
- **Windows file locks:** `git mv` of a folder failed ("Permission denied") while `next dev` was
  watching it. Stop the dev server first.
- **Stale `.next/dev/types`** after moving routes broke `tsc`: delete `.next/dev/types`.
- **Noisy build log:** Neon Auth logged "Cookie validation error" during `next build` because Next
  probes layouts for static rendering and reading cookies aborts that probe. `await connection()`
  at the top of the `(app)` layout marks it dynamic first, so the log disappears.
- **Neon CLI restore output** labels the *source* branch as "Backup branch". The real backup is the
  `--preserve-under-name` branch; check with `neon branches list`.
- **`vercel link` appends `VERCEL_OIDC_TOKEN` to `.env.local`**; it keeps existing keys.
- **Auth production checklist** (not done yet, fine for one user): custom SMTP for auth emails
  (password reset uses Neon's shared sender until then). See
  https://neon.com/docs/auth/production-checklist.md.

## Next

- Optional: a custom domain; delete `production-before-restore`; custom SMTP.
- Multiple choice.
