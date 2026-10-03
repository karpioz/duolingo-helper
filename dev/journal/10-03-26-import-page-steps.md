# Import page instructions and collector fallback

## Summary

- **The import page explains itself now.** Under the status card ("Waiting for words from
  Duolingo…", then the result and "Switch to …"), a "How to import a course" card lists five
  numbered steps:
  1. pick the course on Duolingo;
  2. open practice-hub/words;
  3. **Copy script**;
  4. paste it in the console (incl. Chrome's "allow pasting");
  5. click the green Send button.
- **Copy script** copies `browser-script.js` with `window.DUOLINGO_HELPER_URL = "<this app's
  URL>"` already on top. No more editing the URL by hand: local dev copies localhost, the live
  site copies the live URL (from `x-forwarded-host` / `-proto`).
- **The collector no longer needs a "Load more" button:**
  - It used to fail when you'd already loaded every word (button gone).
  - Now, with no button, it navigates the words page away and back inside the app (pushState +
    popstate, no reload) so Duolingo fetches the first page again, and captures that request.
  - If nothing is caught within 15 s, or anything else fails, it shows a red banner on the
    Duolingo page saying what to do (e.g. "reload this page, then run the script again"), not
    just a console error.

- **Copyable app address:** under Copy script, the line
  `window.DUOLINGO_HELPER_URL = "<current address>";` with its own Copy button, for running the
  script from elsewhere or after a domain change. `CopyButton` (was `CopyScriptButton`) is shared
  by both.
- **A new domain must also be added to Neon Auth's trusted domains** (see
  [auth and deploy](09-29-26-auth-and-vercel-deploy.md)), or sign-in there fails.

## Decisions

- **The script stays one file** (`src/importers/duolingo/browser-script.js`, still usable by hand).
  - `collectorScript()` (`src/importers/duolingo/collector.ts`) reads it at request time.
  - `outputFileTracingIncludes` in `next.config.ts` adds it to the `/import` route's trace, so
    Vercel ships it. Checked: it appears in `page.js.nft.json` after `next build`.

- **Import endpoint hardening (CSRF):** `POST /api/import/duolingo` now rejects, before auth:
  - anything that isn't same-origin: 403. It uses `Sec-Fetch-Site`, falling back to `Origin` vs
    `x-forwarded-host`/`host`; a missing Origin is rejected too;
  - bodies that aren't `application/json`: 415. A cross-site JSON POST needs a CORS preflight,
    which the app never grants.

  Before, the session cookie alone guarded it, so a disguised `text/plain` form POST from
  another site was only stopped by the cookie's SameSite setting (unchecked). Checked with
  curl: no origin / cross-site / foreign origin → 403, same-origin text → 415, same-origin JSON
  signed out → 401. From the signed-in /import page, an empty payload reaches validation
  (400).
- **What else protects the tables:** sign-in plus the `ALLOWED_EMAILS` allowlist, `/import`
  accepting messages only from duolingo.com, zod limits on the payload, and parameterised
  Drizzle queries. The copied script and address hold no secrets.

## Gotchas

- **The fallback is untested against Duolingo.** It relies on Duolingo's router reacting to
  popstate and on the initial words request being a POST with the same body. If either is
  untrue, the banner asks for a reload, which always works. Step 2 of the page says that rather
  than promising the fallback.
- Reading the clipboard from DevTools automation hangs on the permission prompt. The copied text
  was checked server-side instead.
