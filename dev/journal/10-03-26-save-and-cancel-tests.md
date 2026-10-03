# Save generated tests, cancel tests

## Summary

Two new buttons above every running test (typed, multiple choice and match pairs):

- **Add to my tests:** saves the exam's exact words (question order, deduplicated) as a personal
  test with the same type and direction.
  - An inline form asks for a name, suggesting "Recently learned · Spanish → English · 3 Oct".
  - Once saved, the button becomes "In My tests" (a link to the test's edit page).
  - Runs of a personal test show "In My tests" from the start.
  - Also on the results page of generated tests, so you can keep a test after finishing it.
- **Cancel:** a two-step confirm ("Cancel this test? Answers so far are kept."), then back to
  Test me, or to My tests for a personal test's run.

A test-name line ("Recently learned · Spanish → English") sits on the left of the toolbar.

Tested in Chrome on the `dev` branch:
- typed: save, answer one, cancel → My tests shows the test with last run 0/1;
- personal test run: "In My tests"; cancel with no answers → back to My tests, the run's URL 404s;
- match pairs: digits typed in the name field don't select tiles;
- results pages show "Add to my tests" / "In My tests" / "My tests" as appropriate.

## Decisions

- **Saving links the exam to the new test.** It merges `personalTestId` and `testName` into
  `exam_sessions.options`, so the run you saved from counts as the test's last run.
  `listPersonalTests` now finds runs by `options->>'personalTestId'` alone (it used to require
  `source = 'personal'`). The exam keeps its original source and label.
- **Multiple choice personal tests:** a saved multiple choice exam stays multiple choice, so
  `personalTestSchema.mode` accepts `choice`. The creator offers it as a third type. `createExam`
  already handled choice for any source.
- **Cancel keeps what you answered.** Those answers already updated review schedules
  (`applyReview` runs per answer), so deleting them would leave `exam_answers` and
  `review_states` out of step (and `srs:rebuild` would drop those reviews).
  - With answers: `cancelExam` cuts the session down to the answered questions (`questions`,
    match `boards`, `size`), sets `finishedAt`, and it shows in history as a shorter finished
    test.
  - With no answers: the session is deleted.
- Buttons live in the page (`ExamToolbar` in `test/[id]/page.tsx`), not inside the runners, so
  both runners get them unchanged. `defaultTestName` lives in `lib/exam-labels.ts`: pages
  can't export helpers.

## Gotchas

- **The match runner's global number-key handler** selected tiles while typing digits in the
  name field. It now ignores key events from inputs, like the typed runner already did.
- **The inline name form** squeezed into the button group and pushed Cancel onto its own line.
  It renders as `order-last basis-full`, so it takes a full row under the toolbar in any
  wrapping flex parent (toolbar and results page).
- A Python `str.replace` on `  mode: "typed" | "match";` also hit the 4-space-indented copy
  (substring match), so the second, more specific replacement failed. Replace the shared
  substring once instead.
