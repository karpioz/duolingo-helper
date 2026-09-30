# Close sign-up

## Summary

The app has a single user, so account creation is gone. Only the sign-in form is left. This
replaces the allowlist-gated sign-up from [09-29-26-auth-and-vercel-deploy](09-29-26-auth-and-vercel-deploy.md).

## Decisions

- **Block sign-up in the app, not only in the UI.** `/api/auth/[...path]` forwards everything to
  Neon Auth, so `POST /api/auth/sign-up/email` would still create accounts without a sign-up page.
  The route handler now returns 403 for any `/api/auth/sign-up*` POST. The Neon MCP
  `update_auth_config` tool can't turn off sign-up (it only sets the name), so there is no
  server-side switch to use for this.
- The `ALLOWED_EMAILS` check stays in place as a second layer.
- New accounts (if ever needed): create the user in the Neon console / `create_auth_user`, then add
  the email to `ALLOWED_EMAILS`.

## Implementation

- Deleted `src/app/auth/sign-up/page.tsx` and `signUpWithEmail`.
- `AuthForm` is sign-in only (no `mode` prop, no "Create your account" link).
- `src/app/api/auth/[...path]/route.ts` wraps `handler.POST`.

Verified against `next start`: `/auth/sign-up` → 404, sign-up API → 403, sign-in API still reaches
Neon Auth (401 for bad credentials).

## Gotchas

- After deleting a route, `next build` fails on stale `.next/**/types/validator.ts`. Run `rm -rf .next`
  first.
- Probing the live sign-up API right after pushing hit the old deployment and created a real
  account (`x@example.com`, since deleted). Wait for the deploy to finish (check the Vercel
  dashboard) before testing anything that writes to production. Test users are added by hand in
  Neon.
