# Neon setup

## Summary

Neon project `broad-wave-00888067` (region `eu-west-2`) is linked to this folder. Neon Auth is
enabled for later. The Neon agent skills and MCP server are installed.

## Implementation

- Neon CLI (`neon` v6.4.0) installed globally; signed in as `karpioz`.
- `neon skills -y`: 8 Neon skills in `.claude/skills/`, tracked in `skills-lock.json`.
- `neon mcp -y`: added the Neon MCP server (`https://mcp.neon.tech/mcp`) to Claude Code, Codex,
  Gemini CLI and VS Code configs. It minted an account-wide API key
  (`neon-cli-mcp-20260929T200808Z-f07f`, id 3377747).
- `neon link` → `.neon` (git-ignored); `neon config init` → `neon.ts`, with `@neon/config` and
  `@neon/env` in `package.json`.
- `neon.ts`: `auth: true`. The starter branch policy is kept (new branches expire after 7 days),
  with an exception so `dev` never expires.
- `neon deploy`: no changes needed (Auth was already on); pulled env vars into `.env.local`.

## Decisions

- **Branches:** `production` for the deployed app, `dev` for local work (created with
  `neon checkout dev --create`). `.env.local` points at `dev`.
- **Env vars** (in `.env.local`, git-ignored): `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`
  (direct), `NEON_BRANCH`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`.

## Gotchas

- `neon link` warned that the Neon API rejected the token right after login; `neon env pull` a
  moment later worked. If it happens again, retry or re-run `neon login`.
- The MCP API key can reach every organisation on the account. Revoke with
  `neon api-keys revoke 3377747` if that's too broad.
- `neon checkout <branch>` rewrites `.env.local` with that branch's connection strings, so checking
  out `production` locally points the app at production data.
