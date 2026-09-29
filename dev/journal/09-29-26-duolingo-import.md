# Duolingo import (step 3)

## Summary

All 1,223 learned words imported into the Neon `dev` branch, with 3,718 translations and an audio
URL for each word. A second run updated all 1,223 words and created no duplicates.

## How it works

1. **Collector** (`src/importers/duolingo/browser-script.js`) runs in the browser console on
   `duolingo.com/practice-hub/words`:
   - Hooks `fetch`, clicks the page's "Load more" button and captures Duolingo's own
     `learned-lexemes` request (URL, headers, body).
   - Repeats that request with `startIndex` 0, 50, 100, … until `pagination.nextStartIndex` is null.
   - Shows a green "Send N words to Duolingo Helper" button.
2. **Hand-over:** the click opens `http://localhost:3000/import` as a popup. The page posts
   `duolingo-helper:ready` to its opener; the collector replies with `duolingo-helper:import` and
   the payload; the page saves and returns `duolingo-helper:result`.
3. **Save** (`POST /api/import/duolingo` → `src/importers/duolingo/save.ts`):
   - The payload is validated with zod (`protocol.ts`).
   - Words are deduplicated by text; `duo_rank` = position in Duolingo's recently-learned order.
   - In one transaction: upsert words on `(course, text)`, then replace their translations.

## Decisions

- **postMessage between windows** rather than `fetch` from duolingo.com to localhost. Chrome's
  Local Network Access rules block or prompt on public-site → localhost requests; messaging between
  windows isn't a network request. Duolingo sends no COOP or CSP header, so the popup keeps its
  `opener`.
- **Reuse the page's own request body** instead of rebuilding it: the API requires the user's
  `progressedSkills` (course progress), which isn't worth reconstructing.
- **Upsert, not wipe-and-reload:** word ids stay stable, so tags and review history survive
  re-imports. Translations are replaced wholesale (nothing references them).
- **Origin checks both ways:** `/import` only accepts messages from `https://www.duolingo.com`;
  the collector only accepts replies from the popup it opened, at the app's origin.
- **Import API returns 403 in production** until sign-in exists (it has no auth).

## Gotchas

- `window.open` needs a real user click, hence the injected button: calling it from a console
  script is popup-blocked.
- The collector needs a "Load more" button to trigger the capture: reload the words page before
  running it.
- `xmax = 0` in `RETURNING` tells inserted rows apart from conflict updates (Postgres detail).
- **Font fix:** shadcn init sets `--font-sans: var(--font-sans)` in `globals.css` and expects the
  layout's Geist font variable to be named `--font-sans`. The scaffold named it
  `--font-geist-sans`, so the variable referenced itself and pages rendered in the default serif.
  Renamed in `layout.tsx`.
- Base UI `Button` rendered as a `Link` needs `nativeButton={false}`.

## Next

Word list page, test setup ("Test me": count, word source, direction), typed test, tagging, results.
