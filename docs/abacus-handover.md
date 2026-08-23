# Abacus AI → Claude Code handover

**Date:** 2026-08-23 · **Performed by:** claude-cowork, at Rob's direction

Nightingale development moved from Abacus AI Desktop (CodeLLM VM sandbox) to Claude Code. This note records what was migrated, what changed in the repo, and where the salvaged Abacus material lives.

## What changed in this repo

- `prisma/schema.prisma` — removed the hardcoded client `output` path (`/home/ubuntu/ua_us_translator/nextjs_space/node_modules/.prisma/client`), an artifact of the Abacus VM build host. Prisma now generates to the default `node_modules/.prisma/client`. `binaryTargets` kept as-is.
- `CLAUDE.md` — build-gotcha section updated to match.

## Salvaged local Abacus artifacts

Copied to `/Volumes/rmoore-dev/abacus-archive-2026-08-23/` before uninstalling Abacus Desktop:

- `history.jsonl` — VS Code extension prompt log (May–Jun 2026; mostly rghf.org form work, no Nightingale sessions)
- `plans/` — three plan docs: `bruno_to_postman_migration.md`, `fix-oauth-secrets-storage.md`, `newsletter-form-rghf-plan.md`
- `projects/` — one saved session (rushomon, retired 2026-08-23; code preserved at `github.com/akaienso/rushomon`)

Note: no Nightingale-specific sessions existed locally — Nightingale history was cloud-side in the Abacus account.

## Cloud thread export

_Placeholder — Nightingale threads exported from the Abacus web UI are summarized below._
