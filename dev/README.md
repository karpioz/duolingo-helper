# dev/

Development-only files: not part of the app and not deployed.

| Folder | Contents |
|---|---|
| `journal/` | Development notes: decisions, implementation, gotchas. See `journal/README.md`. |
| `scripts/` | One-off maintenance scripts, run with `tsx` (e.g. `npm run srs:rebuild`, `npx tsx dev/scripts/build-verbs.ts`). |
| `smoke/` | Smoke tests against the database in `.env.local`, run with `npx tsx --conditions=react-server dev/smoke/<file>.ts`. |

Add new folders here as needed (e.g. `smoke/` for smoke tests, `scripts/` for one-off tools,
`fixtures/` for sample data) and list them in this table.
