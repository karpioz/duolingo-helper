# Match pairs (step 6)

## Summary

A second test type, like Duolingo's "Select the matching pairs": two columns of up to 5 tiles
(Spanish | English, English | Spanish, or mixed per board).

- **Keys:** 1–5 select the left column, 6–9 and 0 the right; Esc deselects.
- **Selected** tile is blue. **Correct** pair flashes green, then goes muted and disabled.
- **Wrong** pair flashes light red with a small shake, then resets.
- Selecting a Spanish tile plays its audio. Boards save as they're finished, so a reload resumes
  at the next board. The last board goes to the results page.

Tested in Chrome: keyboard and click selection, all tile states, two quick consecutive matches,
resume after reload, results and retest.

## Implementation

- **Setup:** "Test type" (Type answers / Match pairs). For match, "Direction" becomes "Columns"
  and lenient checking is hidden. `examOptionsSchema.mode` (`typed` | `match`).
- **Boards** (`src/lib/match.ts`, 7 vitest tests):
  - `buildBoards`: first-fit into boards of 5, never putting two words that share a translation
    (after hint and article normalisation) on one board. Every pairing on a board is unambiguous.
  - Rebalancing: if the last board ends up with fewer than 3 pairs, compatible words move in from
    boards that can spare one (12 words → 4+5+3, not 5+5+2).
  - `pickLabel`: English tile text prefers a hinted form ("(you) learned") over a bare
    "learn", skips "(?)" question forms.
- **Storage:** no new tables. Board sizes are stored in `exam_sessions.options.boards` (questions
  stay in board order); mixed direction is decided per board. `mode = 'match'` was already in the
  enum.
- **Scoring:** one `exam_answers` row per word, saved per board (`recordMatchBoard`). A word is
  correct only if it was never part of a wrong pairing. Both words in a wrong pair count as a
  mistake, since either could be the unknown one. Response time = board time ÷ pairs.
- **Right column** is shuffled on the server (`shuffleUnlikeIdentity`), never in the same order
  as the left column. Shuffling in a client component's render would break React purity rules.
- **Labels:** `describeExam(source, direction, mode)` prefixes "Match pairs". Results say
  "Mismatched at least once" instead of "Skipped", and "Retest missed" keeps the same mode.

## Gotchas

- **Stale closures in timers:** the correct-match timeout originally used `matched` and
  `mistakes` from state, and each new pairing cleared the previous timer. Matching two pairs
  within 350 ms dropped the first one. Fixed with refs (`matchedRef`, `mistakesRef`), one timer
  per flash, and a list of flashes instead of a single one.
- **Synthetic key events** dispatched in the same JS tick don't get a React render between them,
  so they look like a bug that real key presses can't cause. Put a small delay between simulated
  keys in tests.
- **Background tabs** throttle timers to ≥ 1 s, so flash timings look slow when testing a hidden tab.

## Next

Multiple choice (typed test variant); spaced repetition; deploy.
