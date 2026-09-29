# Analytics page (step 5)

## Summary

New `/analytics` page (linked in the header), built from `exam_sessions` and `exam_answers`;
no schema changes.

- **Tiles:** accuracy, current / longest streak and active days, words practised (of all words),
  typical (median) answer time, tests finished.
- **Activity calendar:** GitHub-style year grid of answers per day, with a hover tooltip
  (answers, % correct, date), a Less → More legend and a "Show as table" view.
- **Score by test:** line chart of the last 30 finished tests; hover shows score, test type
  and time; "Show as table" links to each result.
- **Accuracy by direction:** ES→EN vs EN→ES, with answer counts.
- **Word coverage:** known / missed last time / not practised, as one part-to-whole bar.
- **Hardest words:** most wrong answers, with "missed / right last time" and tag toggles.

## Implementation

- Queries live in `src/server/stats.ts`. Streaks are computed in JS from the daily activity.
- Charts are plain SVG/HTML client components in `src/components/charts/`; no chart library.
- **Time zone:** answers are stored in UTC and bucketed into days in `APP_TIMEZONE` (default
  `Europe/London`; env var to change). Dates go to the client as `YYYY-MM-DD` text, never as JS
  `Date`, and all calendar maths uses UTC dates, so the browser's own time zone can't shift a day.
- **Calendar layout:** one CSS grid (weekday labels + one column per week, `minmax(0, 1fr)`),
  square cells via `aspect-square`, so it fills the card. Below 36rem it scrolls sideways,
  starting at the latest weeks. Level 1–4 = quarters of the busiest day's count; 0 = empty cell.
- **Score chart** measures its container (`ResizeObserver`) and draws at the real pixel width,
  so text and dots keep their size (a scaled `viewBox` shrank 11px labels to ~6px).

## Decisions

- **Colors (per the dataviz skill), validated with its palette script:**
  - Calendar ramp, green (to match GitHub / Duolingo):
    `#6cc47a #3fa653 #23843a #145c27` on light; dark mode (`.dark`) brightens instead:
    `#1d5c2c #26803b #36a650 #5fd07a`. Both pass the ordinal checks: single hue, monotone
    lightness, light end ≥ 2:1 contrast. GitHub's own lightest green (`#9be9a8`, 1.44:1) failed.
  - Score line: categorical slot 1 blue `#2a78d6`.
  - Coverage: status good `#0ca30c` / critical `#d03b3b` plus neutral gray, always labelled
    with counts in the legend.
  - Tokens are `--viz-*` in `globals.css`.
- **Tooltips flip below the cell on the top rows and align inward at the edges**, so the scroll
  container doesn't clip them.
- **Every chart has a table view**, so nothing relies on color or hover alone.

## Gotchas

- **The editor's TypeScript server shows stale errors** (e.g. `"retest"` not in the enum) after
  schema or route changes. `npm run typecheck` is the source of truth; restart the TS server in
  the editor to clear them.

## Next

Multiple choice and match pairs; spaced repetition; deploy.
