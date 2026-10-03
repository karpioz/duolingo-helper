# Main meaning per word

## Summary

Match tiles showed Duolingo's first translation (via `pickLabel`), which often isn't the obvious
one: "plato" → dish (expected plate), "comida" → eaten, "cocina" → (he) is cooking. Two fixes:

1. **Main meaning picked by you, per word.** It's used on match tiles and multiple choice options,
   and listed first in English → Spanish prompts.
   - **Test creator:** chips show `word · meaning`. Click a chip to open a picker under the
     chips, then tap a meaning to make it the main one; tap it again (or "Back to automatic") to
     undo.
   - **Words page:** the translations line is the picker. Dotted underline = automatic choice,
     solid = your pick; click any translation to pick it. Words with one translation stay plain
     text.
   - Saves immediately (`setMainMeaning`). The UI updates optimistically and reverts on error.
2. **Smarter automatic choice** (`autoLabel` in `src/lib/match.ts`) for the ~600 words you'll
   never pick by hand.

Tested in Chrome on the `dev` branch: chose plate / food / kitchen in the creator → match board
showed those tiles; picked "plan" on the Words page → persisted after reload.

## Decisions

- **Per word, not per test:** a word's meaning doesn't change between tests, and Test me runs
  (Due, Random, …) benefit too. Per-test overrides would mean choosing again in every test.
- **Stored as text** (`words.preferred_translation`, migration `0004`), not a translation id:
  the Duolingo importer deletes and re-inserts translations on every import, so ids don't
  survive. If a re-import drops that text, `pickLabel` ignores it and falls back to `autoLabel`.
  `setPreferredTranslation` only accepts one of the word's current translations.
- **Grading is unchanged.** Typed answers still accept every translation, and match boards still
  separate words that share any translation (`signature` uses all of them).
- **No multiple meanings on a tile** ("dish / plate"): it makes tiles long and the game too easy.
- `labelOf(word)` / `labelFirst(word)` wrap `pickLabel(translations, { spanish, preferred })`.
  `optionLabel` / `hintOf` in `choice.ts` now take the word.

## Automatic choice (`autoLabel`)

The score starts from Duolingo's order (−0.25 per position). Then:

- **Hinted verb forms:** +2, or +3 when the plain form is also listed ("(you) learned" with
  "learned"). Same idea as before: the hint pins person and tense.
- **Junk:** −10 for "(?)" questions, "(since)" fragments, dashes and possessives ("bag's",
  "rooms'"). "how's", "it's" and similar contractions are not junk.
- **Plain forms lose points for:**
  - contractions with 'll / 'd / 've / n't: −2;
  - a comparative, superlative or -ly form of another option ("happier"): −4;
  - a plural of another option when the Spanish word is singular ("plants", "museums"): −3;
  - a capitalised echo of the Spanish word ("Rio" for "río"): −3;
  - an "-ed" form when the word has no verb forms and isn't a participle ("designed" for
    "plan"; `-ado/-ido/-to/-cho` words like "cansado", "frito" keep "tired", "fried").

I diffed it against the old rule on all 615 multi-translation words: it changes 75. Most are
clear wins:
- (I) wait (was "(I) am waiting for"), happy (was "happier"), room / year / bag (were possessives);
- (we) are (was "have been (since)"), (I) laugh (was "(I) am laughing"), fear (was "scared").

A few just swap one questionable pick for another ("plan" → plots, "tipo" → stick, "planta" →
floor). Those are what the manual pick is for. Real examples are pinned in `match.test.ts`.

## Gotchas

- **Rejected rule: "same as the Spanish word" bonus.** Duolingo lists the Spanish word itself as
  a translation for many nouns (granja, salsa, chorizo, lees), so the bonus picked those.
- **Rejected rule: penalising capitals.** It broke "Chinese" for "chino".
- **Python string escapes:** editing TypeScript regexes through non-raw Python strings turned
  `\b` into a backspace character, so the Edit tool couldn't match the text. Use a raw heredoc
  file for regex-heavy code.
- `'s?\b` matched "you'll" and "don't" too: possessives need `'s\b`.

## Next

- Maybe: show the main meaning in results and the typed-test feedback; bulk review of
  automatic picks.
