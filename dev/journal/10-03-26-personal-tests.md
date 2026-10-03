# Personal tests

## Summary

Hand-built word lists you can save and run again. On **Test me**, a fourth card, "Personal →",
opens **My tests** (`/test/personal`):

- **List:** name, type · direction · word count, and the last finished run (links to its
  results). Each row has Start, Edit and Delete. Delete takes two clicks, with no browser dialog.
- **Creator** (`/test/personal/new`, `/test/personal/[testId]` to edit):
  - Name, type (Type answers / Match pairs; multiple choice was left out on purpose) and
    direction/columns.
  - The word search shows recently learned words when empty and matches Spanish or English.
    Click a result to add or remove it, Enter adds the top result, "Add all N" adds every match.
  - Picked words show as removable chips. "Save test" goes back to My tests, "Save and start"
    goes straight into a run.
- **Runs** use the existing typed / match runners. Results show "Match pairs · <test name> · …"
  and a "My tests" button, and the home page's recent tests show the name too.

Tested in Chrome against the `dev` branch: create (click, Enter and search), save, run as match
pairs, results, last run on the list, edit (type, direction, removed word, renamed) → Save and
start → typed run, two-step delete, empty state. No console errors. `dev/smoke/personal-tests.ts`
covers the server side.

## Decisions

- **Two tables:** `personal_tests` (name, `mode`, `direction`) and `personal_test_words`
  (`test_id`, `word_id`, `position`; deleting a test or a word cascades). They reuse the
  `exam_mode` / `exam_direction` enums; the creator only offers `typed` and `match`.
- **New exam source `personal`** (migration `0003`). `examOptionsSchema` takes
  `personalTestId`, and `pickWordIds` reads the test's words. Runs go through `createExam`, so
  shuffling, match boards and SRS grading work as for any other test.
- **The name is snapshotted** into `exam_sessions.options.testName` when a run starts. History
  keeps the name it was run under, and still has a label after the test is deleted.
  `describeExam(..., testName)` shows it in place of "Personal".
- **Last run** comes from `exam_sessions` with `source = 'personal'` and
  `options->>'personalTestId'`. That's a lateral join with no index, which is fine at this size.
- **A run uses all of a test's words** (capped at 200, the exam maximum), with the type and
  direction stored on the test. There are no per-run options: change the test to change the run.
- **Match pairs needs ≥ 2 words** (zod refine plus a hint in the form). One pair isn't a puzzle.
- **Saving replaces the word list** (delete + insert in one transaction). Ids that aren't words
  in the course are dropped silently.
- The option cards / choice buttons moved from `test-setup-form.tsx` to
  `src/components/option-controls.tsx`, and `matchesQuery` was pulled out of `listWords` for the
  creator's search. The creator ranks exact match first, then prefix, then recently learned.

## Gotchas

- **`<fieldset>` defaults to `min-width: min-content`**, so a long translation in the result
  list (even with `truncate`) stretched the whole "Add words" field past the form. Added
  `min-w-0` to `Field`.
- **Stale search results:** results lag behind typing, so the label said "4 matches" for the
  previous query, and Enter could add a word from the old list. The state now stores
  `{ q, words }`. While `q !== query` the form shows "Searching…", dims the list and ignores
  Enter.
- **Hot reload kept an old copy** of the creator after an edit, so the fix looked broken.
  Reload the page before deciding a client fix didn't work.
- **Match runner and fast keys:** keys pressed during the red "wrong pair" flash are ignored, so
  rapid scripted presses pair the wrong tiles. This is the runner's existing behaviour; space
  key presses out (or click) when testing.
- The smoke script doesn't record answers, because that would move real words' review dates. It
  marks the run finished directly instead.

## UI follow-up (after first use)

- **Empty name was easy to miss:** Save was disabled with no reason given. An empty name now gets
  a light-red border and background (`aria-invalid`), plus "Name the test to save it." once
  words are picked.
- **"In this test" moved above "Add words"** into its own panel (`bg-muted/40`, border,
  padding), with "Remove all" in its header. The picked words stay in view while you search.
- **Delete in My tests** uses the `destructive` button variant (red icon, light-red background).

## Next

- Maybe: start a personal test from the Words page ("add to test…"), reorder words, choose
  multiple choice for a personal test.
