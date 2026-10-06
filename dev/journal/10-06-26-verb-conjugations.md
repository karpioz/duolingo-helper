# Verb conjugation lookup (`/verbs`)

## Summary

A new **Verbs** page, linked in the header after Words. Type an infinitive (`hablar`) or a form
you saw (`fui`, `tengo`, `me acuesto`). Autocomplete suggests infinitives as you type. Enter on
a conjugated form opens its verb. A note shows the matching tense and person, and lists any other
verbs with the same form ("fui is ir · Pretérito indefinido · yo. Also: ser…"). The matching cell
is highlighted, and the tab that holds it opens. Pills for ser, estar, ir, hacer, tener, hablar,
poder and querer sit under the search box.

The verb card shows the infinitive, its English meaning, the gerund and the participle, and a
Regular/Irregular badge (plus Reflexive). Tabs: **Core tenses** (presente, indefinido,
imperfecto, futuro) and **Conditional & subjunctive** (condicional, presente de subjuntivo).
Letters that differ from the regular -ar/-er/-ir pattern are bold terracotta: p**ue**do,
ten**g**o, ten**d**ré, d**u**rmió, **fui**.

## Decisions

- **Data: Fred Jehle's conjugated verb database** (637 common verbs, CC BY-NC-SA 3.0, via
  github.com/ghidinelli/fred-jehle-spanish-verbs). It is human-checked, has accents, and includes
  English meanings, gerunds and participles. This is non-commercial personal study, which the
  license allows, and the page footer credits the source. `dev/scripts/build-verbs.ts` turns the
  3 MB CSV into `src/data/spanish-verbs.json` (400 KB, six tenses only). Run it again to refresh.
- **Not in Neon.** This is reference data, not words the user learned, so it ships with the code.
- **Kept on the server.** The page is a server component, so the JSON stays out of client
  bundles (checked: no forms in `.next/static`). The client gets only `{ inf, en }` for
  autocomplete (about 30 KB). Conjugated forms are resolved on the server via `?v=`.
- **The regular-pattern generator is used only to highlight.** `regularForm()` builds the form
  as if the verb were regular. `markIrregular()` diffs it against the real form by common
  prefix and suffix. All displayed forms come from the database. Spelling changes
  (busqué, jugué) are marked too. They differ from the pattern, which is worth seeing.
- **Search folds case and accents** with the existing `normalize`/`stripAccents` from
  `lib/answers`. A reflexive pronoun in the query (`me acuesto`) ranks reflexive verbs first.
- Added shadcn `Tabs` (`npx shadcn add tabs`).

## Gotchas

- Impersonal verbs (llover, nevar, doler, ocurrir) have blank persons in the data. They render as "—".
- A bare "fui" also matches `irse` ("me fui"), so it appears among the "Also" verbs.
- `ser` presente yo marks only the `y` of `soy` (regular would be "so"). That is correct for the
  diff, if a bit literal.
- The theme has no dark overrides for terracotta/saffron. The page adds `dark:` variants for
  its highlights.
- Chrome won't shrink the window below a ~634px viewport. To test phone width, load the page in
  a 360px same-origin iframe and check `scrollWidth`.
- The hydration warning on `<body cz-shortcut-listen>` comes from the ColorZilla extension, not
  from the app.

Checked in Chrome: `fui` (ir, with ser and irse under "Also"), `tengamos` (opens the
subjunctive tab), autocomplete for `dor`, and `me acuesto` at 360px. No horizontal overflow at
360px. Dark mode (`.dark` on `<html>`) reads fine.

## Follow-up: Spanish courses only

There is now a Turkish course, so the **Verbs** link appears only when the current course's learning
language is Spanish. `NavLinks` takes the course, and links can list `languages`. If you switch
course while on `/verbs`, the page says conjugations are Spanish-only. It shows no Spanish data.

Turkish conjugation was considered and left out. The only npm option is `turkish-conjugator`
(last released 2019). It has no translations and no vetted data, unlike the Jehle database
behind the Spanish page. Turkish verbs are agglutinative and mostly regular (vowel harmony,
consonant softening, a dozen irregular aorists), so a Turkish page would need a rule engine
plus tests against a reference rather than a lookup table. That would be a separate project.
