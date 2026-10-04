# My tests: icon actions and a quieter row

Follows [per-run type and direction](10-04-26-personal-test-run-options.md).

## Summary

- **Icon actions with tooltips:** Start is a round teal ▶ (spinner while starting), Edit is a
  ghost pencil and Delete keeps its red trash. Each has a tooltip. Start's tooltip says what will
  run ("Start: Match pairs · English | Spanish").
- **Lighter pills:** no border, a soft `bg-muted/70` fill, `h-6`. The direction pill shows only
  🇪🇸 → 🇬🇧 ⇄, and the language names went into its tooltip ("Spanish → English. Click to
  reverse."). The teal "changed" look is unchanged.
- **Last run** moved onto the pill line as a type icon plus "6/10 · 4 Oct". The tooltip says
  "Last run 4 Oct as Type answers. Open results." The separate "Last run …" line is gone.
- New `src/components/ui/tooltip.tsx`: a thin wrapper over Base UI's Tooltip (300 ms delay,
  above the trigger, dark popup). It's the first tooltip in the app, and the native `title`
  attributes on this page were replaced with it.

## Decisions

- **Multiple choice is back in the type pill, but only for tests saved that way.** The creator
  offers multiple choice now, though the 10-03 note said it was left out. A test saved as
  multiple choice cycles Multiple choice → Type answers → Match pairs, and every other test
  toggles between the last two. Before this fix, a multiple-choice test would have shown "Type
  answers" and run as typing. `choice` is never sent as an override, because it can only be the
  test's own type.
- Match pairs is skipped in the cycle for tests with fewer than 2 words. If that leaves no other
  type, the pill is disabled and its tooltip says why.

## Gotchas

- In dev, clicks made in the first seconds after a page load are lost while it hydrates (the
  background Chrome tab is slow). This is not caused by the tooltip: a second click works.
- I clicked a test's name by mistake (it's a link to Edit). Use `find` refs, not coordinates read
  off a scaled screenshot.
