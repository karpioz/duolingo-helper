# Multiple choice

## Summary

A third test type: pick the translation from 4 options. It works in both directions (Spanish
options for English prompts, English options for Spanish ones) and with mixed direction.

- **Keys:** 1–4 pick an option, Enter goes to the next question, and tag shortcuts work as in
  typed tests. "I don't know" is a button.
- **Feedback:** the right option turns green, a wrong pick turns red and shakes, and the rest fade.
  The feedback box, tags and "Next review in …" are the same as in typed tests.
- **Results:** "You picked: …" for wrong picks. "Retest missed" keeps the mode and draws new options.

Tested in Chrome against the `dev` branch: wrong/right/"I don't know", keyboard and mouse,
resume after reload, results and retest.

## Decisions

- **Reuse the typed runner.** Multiple choice has the same flow as a typed test, with buttons
  in place of the input. `TestRunner` renders `ChoiceOptions` when a question has `choices`, so
  progress, feedback, tags and scheduling stay shared.
- **Options are fixed when the exam is created.** They're stored as word ids in
  `exam_sessions.options.questions[i].choices` in display order. A reload shows the same options,
  and the server grades against its own copy. The answer's index is never sent to the page before
  answering (`getExam` returns `choiceAnswers` separately, and the page only passes `questions`).
- **Grading:** right → Good, wrong or "I don't know" → Again, the same as match pairs. Picking is
  easier than typing, so if choice-only practice pushes intervals out too fast, grade right
  answers as Hard.
- No migration: `choice` was already in the `exam_mode` enum.

## Implementation

- `src/lib/choice.ts` (+ tests): `pickDistractors` draws from the whole course.
  - **Never ambiguous:** an option can't share a normalized translation with the answer or with
    another option (reuses `signature`/`overlaps` from `match.ts`). It also can't contain another
    option as whole words ("beautiful" / "so beautiful").
  - **Plausible:** a score from the same English hint ("(I) …" = same person and tense, the
    strongest signal), a shared ending, the same word count and a similar length, plus random
    jitter so options vary.
- `recordAnswer(sessionId, index, { text } | { choice }, ms)`, and a new `submitChoice` action.
- Setup: "Multiple choice" card. Lenient checking is shown for typed tests only.
  `describeExam` prefixes "Multiple choice".

## Gotchas

- Scoring only on shared endings gave "nueve" / "diecinueve" as options for "estuve (I was)".
  They look alike but are obviously numbers. The English hint fixed this.
- Enter while answering a choice question would have gone through the typed-answer path. The form
  ignores Enter until an option is picked.
- Python on Windows writes CRLF in text mode. Use `newline=""` for scripted edits. Don't run
  Prettier: the repo has no config, and the defaults reformat whole files.
