# Git and GitHub (step 2)

## Summary

Repository initialised on `main` and pushed to `https://github.com/karpioz/duolingo-helper`.
First commit: `a15f9a9` (the scaffold from step 1).

## Decisions

- **Committed:** app code, Drizzle migrations, `neon.ts`, the Neon agent skills (`.claude/skills/`,
  `skills-lock.json`) and `dev/`.
- **Not committed:** `.env*` (connection strings), `.neon` (local branch link), `node_modules`,
  `.next`.
- **`.gitattributes`** with `* text=auto eol=lf`: files are stored with LF line endings in the repo.
  Git on this machine converts to CRLF (`core.autocrlf`), which would otherwise make diffs noisy
  when working from other systems or Vercel.

## Gotchas

- After cloning on another machine, `.env.local` and `.neon` are missing: run `neon login`, then
  `neon link --project-id broad-wave-00888067` and `neon checkout dev`.
