# Personal tests: change type and direction per run

## Summary

Each row in **My tests** now has two pills under the name. Click one to change the next run
without editing the test:

- **Type:** keyboard icon "Type answers" ⇄ two-tiles icon "Match pairs". Multiple choice is left
  out on purpose. Disabled for tests with fewer than 2 words, since match pairs needs at least
  2 words.
- **Direction:** "🇪🇸 Spanish → 🇬🇧 English ⇄". A click reverses it. Match pairs shows columns
  ("Spanish | English").

A pill that differs from the saved test turns teal (ring and soft background). Its tooltip
says the change applies to this run only and that Edit changes it for good. The word count moved
next to the name. The "Last run" line now names the type the run used ("Last run 3 Oct · Match
pairs: 10/10 · 100%").

Tested in Chrome on the `dev` branch: switched Pawel 1 to Match pairs, English first → Start →
match board with English on the left. Back on the list, the test still read Type answers ·
Spanish → English. No console errors.

## Decisions

- **Overrides go only to the run.** `startPersonal(id, overrides?)` takes optional
  `mode` (`typed` | `match`) and `direction`, checked with zod. The run's `exam_sessions` row
  already stores its own mode and direction, so no migration was needed.
- **The pills only toggle**, rather than opening dropdowns: there are only two values each. "Mixed"
  is in the direction cycle only when the test was saved as mixed.
- **Pill state is per row and not persisted.** It resets on reload, so the saved test is the
  default every time.
- **Last run** reads `e.mode` in the lateral join (`listPersonalTests`), because a test's latest
  run may have used another type.
- Rows became a client component (`test-row.tsx`). The page formats the last-run date on the
  server so that server and client render the same text.

## Gotchas

- Python's text mode on Windows wrote CRLF line endings into edited files. Use `newline=''`.
- Clicks made right after navigation were lost before hydration. Wait a moment before scripting
  clicks.
- Chrome screenshots timed out while the window was in the background. `find`/`read_page`
  still worked.
