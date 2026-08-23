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


## Hosting migration — BLOCKS Abacus cancellation

The account cannot be canceled yet: Abacus still hosts the running app. As of 2026-08-23:

- `app.nightingale.im` — Cloudflare-proxied (zone is on Cloudflare NS rita/jack) to an Abacus origin
- `nightingale.im` apex — A record to `66.71.220.11` (Abacus hosting, marketing site from the "Nightingale Marketing Site" session)
- DNS itself is already on Cloudflare, so cutover is a record change, not a registrar move

### Dependencies that die with the account (verify each before cancel)

1. **Production PostgreSQL.** `DATABASE_URL` almost certainly points at Abacus-managed Postgres. `pg_dump` the production database (schema + data) FIRST — this is the only irreplaceable piece. Users, translations, and chat history live here (`prisma/schema.prisma`).
2. **App + marketing-site hosting** (both origins above).
3. **`ABACUSAI_API_KEY`** — the app's AI features may route through Abacus RouteLLM. `.env.example` also has `ANTHROPIC_API_KEY`; confirm the code path and switch AI calls to direct Anthropic before cutover.
4. **Production env values.** Copy every secret out of the Abacus deployment config while the UI is still accessible: `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `TURNSTILE_*`, `NOTIF_ID_*`, `AWS_*`, `NEXT_PUBLIC_CF_ANALYTICS_TOKEN`, `DATABASE_URL`.

Independent of Abacus (no action): S3 uploads bucket (AWS), Turnstile + web analytics (Cloudflare), Google OAuth client, the domain/DNS.

### Migration plan (separate code session)

1. Export prod DB + all env values from Abacus (step 1–4 above)
2. Stand up Postgres (Neon/Supabase, or Hyperdrive-fronted if going Cloudflare) and restore the dump; `prisma db push` to verify schema parity
3. Pick host: **Vercel** (least friction for Next.js 14 App Router + Prisma) or **Cloudflare Workers** via `@opennextjs/cloudflare` (keeps everything in the existing CF account; more build work, Prisma needs driver adapters). Deploy from `akaienso/nightingale`
4. Deployment workflow: GitHub Actions on push to `main` — typecheck (`tsc` fails builds; lint doesn't), build, deploy, `prisma migrate` step. Preview deploys per PR if Vercel
5. Update `NEXTAUTH_URL`, Google OAuth redirect URIs, and Turnstile domain for the new origin
6. Cut DNS in Cloudflare (app subdomain origin + apex), verify login/translate/upload flows in prod
7. Rehost or fold in the marketing site (currently Abacus-hosted at the apex)
8. Only then: cancel Abacus

**Sequencing note:** the pending rebrand (session 15, soloveico assets) touches domain, `NEXTAUTH_URL`, OAuth redirects, and Turnstile config — the same surfaces as the hosting cutover. Doing rebrand + rehost in one cutover avoids configuring `nightingale.im` twice.
