# Multiple courses (Spanish + Turkish)

## Summary

The app now handles several Duolingo courses side by side, starting with Spanish (`es-en`, 1,223
words) and Turkish (`tr-en`, ~58 words, imported separately).

- **Header course switcher:** flag + language name, opening a menu of imported courses with word
  counts, plus "Import another course" (→ `/import`). The choice is kept in a `course` cookie
  for a year.
- **Scoped to the current course:**
  - Words page, Test me (word sources, due counts, tag counts), My tests and the test creator's
    search;
  - Home (greeting, stats, recent tests) and analytics (totals, accuracy, scores, coverage,
    hardest words, forecast).
- **Not scoped: daily activity and streaks.** These count across all courses: a day you studied
  Turkish still keeps the streak.
- **Per-language text:**
  - "Turkish → English", "Translate into Turkish", "Type in Turkish…" and the search
    placeholder;
  - the home greeting ("Merhaba!" / "¡Hola!") and the `lang` attributes;
  - the typed test's letter keys: ç ğ ı İ ö ş ü for Turkish, á é í ó ú ñ ü ¿ ¡ for Spanish.
- **Import page:** says which course arrived ("🇹🇷 Turkish from English: import complete") and
  offers "Switch to Turkish" when it isn't the current course.

Tested in Chrome on `dev`, using 6 temporary Turkish words (seeded with `source = 'dev-seed'`,
removed afterwards):
- switch to Turkish → "Merhaba!", 6 words, Turkish direction labels;
- typed English → Turkish test: Turkish keys shown, "ispanak" for "ıspanak" and "tesekkurler"
  graded "almost";
- the Turkish run doesn't appear in Spanish's recent tests; switching back restores Spanish.

## How to import Turkish

The collector already reads the course from Duolingo's request URL
(`/courses/tr/en/…` → `tr-en`; see [duolingo import](09-29-26-duolingo-import.md)), and words
upsert on `(course, text)`. So:

1. On duolingo.com, switch your active course to Turkish.
2. Open practice-hub/words and run the collector as usual.
3. Set `window.DUOLINGO_HELPER_URL` to the live site to import into production.

## Decisions

- **Current course = cookie, validated.** `currentCourse()` (`src/server/course.ts`, React
  `cache`d per request) uses the cookie while that course has words, else the course with the
  most words. Outside a request (dev scripts) there's no cookie, so it falls back the same way.
- **Exams carry their own course** (`exam_sessions.course`, already in the schema). Grading
  (`alternativeWords`), labels, the runners' language and retests use the session's course,
  not the cookie, so a test stays right if you switch courses mid-way.
  `examOptionsSchema.course` lets retests and personal tests pin theirs.
- **Personal tests keep their course.** New tests go in the current course. Editing (search,
  save) uses the test's own course, so switching courses can't empty a test on save.
- **Language data lives in `src/lib/courses.ts`:** names, letter keys, greeting and course-id
  parsing (`es-en`, `zh-CN-en`). Unknown languages fall back to their code. Flags
  (`components/flag.tsx`) cover es / en (UK) / tr, with a code badge otherwise.
- `describeExam` now takes an object (`{ source, direction, mode, course, testName }`), so call
  sites can pass a session or a row as is. `DIRECTION_LABELS` is replaced by
  `directionLabel(direction, course)`.
- **Lenient matching treats Turkish dotless ı as i** (`stripAccents`). Cedillas and breves were
  already stripped as diacritics. Postgres `unaccent` handles search.
- No migration: `words.course`, `exam_sessions.course` and `personal_tests.course` existed from
  the start.

## Gotchas

- **The header overflowed at desktop width** once the switcher was added: the links became a
  scrolling strip. The header container is now `max-w-5xl` (pages stay narrower), and the
  email shows only from `lg`.
- `latestAnswers()` was global; it now takes the course, which fixes "Missed last time" counting
  other courses' words.
- `autoLabel` still has Spanish-shaped rules (participle endings, plural "s"). For Turkish they
  rarely fire; the manual main meaning covers the rest.
