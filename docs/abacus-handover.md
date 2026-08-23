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

All 37 conversations in the Abacus account (19 Nightingale + 18 across ServiceSelfies, UARTF, and misc.) were exported with full message history on 2026-08-23, before cancellation, to:

`/Volumes/rmoore-dev/abacus-archive-2026-08-23/abacus-export-all-2026-08-23.jsonl` (10.6 MB, one JSON record per conversation: id, projectId, name, createdAt, totalEvents, history)

### Nightingale session index (project b9d61ca63)

| Date | Session | Events | Topic |
|------|---------|--------|-------|
| 2026-07-08 | Cross-Platform Translator App | 105 | Original build: distributable web/mobile/desktop translator |
| 2026-07-08 | UA/US Translator - Core App | 33 | Full-stack UA↔US colloquial translator build |
| 2026-07-08 | Olia Avatar Illustration | 1 | Olia avatar/character portrait |
| 2026-07-11 | Nightingale Marketing Site | 5 | Single-page marketing/support site for app.nightingale.im |
| 2026-07-11 | 1 - Core App | 52 | Palette fixes (pink buttons vs. logo green) |
| 2026-07-12 | 2 - Core App | 46 | Image/document tab language-detection UX |
| 2026-07-12 | 3 - Core App | 33 | Credit-burn budgeting for chats/translations |
| 2026-07-13 | 4 - Core App | 33 | Logo usage in app nav |
| 2026-07-13 | 5 - Core App | 40 | Post-demo feedback from (real) Olia; fixes |
| 2026-07-14 | 6 - Core App | 31 | Two translation-page UI bugs |
| 2026-07-15 | 7 - Core App | 17 | Cloudflare Analytics how-to (v1.7.1 era) |
| 2026-07-20 | 8 - Core App | 32 | Continuation of 7; codebase catch-up |
| 2026-08-02 | 9 - Core App | 5 | Finish item reordering |
| 2026-08-02 | 10 - Core App | 32 | Spanish as app language — investigation |
| 2026-08-03 | 11 - Core App | 43 | Light/dark icon set generation |
| 2026-08-09 | 12 - Core App | 35 | Regression cleanup; version/changelog discipline |
| 2026-08-09 | 13 - Core App | 39 | Style-fix patch release (patch bump) |
| 2026-08-10 | 14 - Core App | 0 | (empty session) |
| 2026-08-21 | 15 - Core App | 3 | Zip package for local study; **pending rebrand** — cosmetic rename away from "Nightingale"/nightingale.im due to trademark conflict (agent's 5 open questions unanswered at export time) |

**Open item at handover:** the rebrand from session 15 was never executed in Abacus. New-name candidates and logo assets ("soloveico" wordmark/icon webp files, downloaded 2026-08-22) are in Rob's Downloads. First Claude Code session should pick this up.
