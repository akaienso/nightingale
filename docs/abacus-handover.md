# Abacus AI → Claude Code handover

**Date:** 2026-08-23 · **Performed by:** claude-cowork, at Rob's direction

> **Read `docs/migration-status.md` alongside this doc.** The first Claude Code session
> verified this plan against the code and found several items here to be out of date —
> most importantly, **the AI provider switch to direct Anthropic is already done** (the
> real Abacus coupling is transactional email), and **the repo has no `package.json`**.
> Corrections are listed in §5 of that doc.

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

The account cannot be canceled yet: Abacus still hosts the running app **and its production database**. As of 2026-08-23:

- `app.nightingale.im` — Cloudflare-proxied (zone is on Cloudflare NS rita/jack) to an Abacus origin
- `nightingale.im` apex — A record to `66.71.220.11` (Abacus hosting, marketing site from the "Nightingale Marketing Site" session)
- DNS itself is already on Cloudflare, so cutover is a record change, not a registrar move

### Agreed sequencing (Rob, 2026-08-23)

1. **Finish the rebrand inside Abacus first** (browser) — *cosmetic scope only*: app/product name, Olia naming decision, logos/icons (soloveico assets), palette, in-app copy, version bump + changelog. **Defer to the cutover:** new domain DNS, `NEXTAUTH_URL`, Google OAuth redirect URIs, Turnstile domain. Configuring those on Abacus for a host you're leaving means doing them twice.
2. **Full project export from Abacus** (zip, as in session 15) — and **sync it into this git repo**: unzip, diff against `akaienso/nightingale`, commit the rebrand changes. The repo is the source of truth Claude Code starts from; an unsynced zip on disk doesn't count.
3. **Database dump + env capture** (explicit runbooks below).
4. **Rehost + deployment workflow** (plan below).
5. **Cancel Abacus** — only after step 6 of the migration plan verifies clean.

### DB dump runbook (do while Abacus is still alive — this data is irreplaceable)

The app's users, translations, and chat history live in a PostgreSQL database that Abacus manages. It disappears with the account. Steps:

1. **Get the connection string.** In the Abacus web UI, open the Nightingale deployment's environment/secrets config and copy `DATABASE_URL`. It looks like `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`.
2. **Test connectivity from the Mac** (Postgres client tools: `brew install libpq` if `pg_dump` is missing, then use `$(brew --prefix libpq)/bin/pg_dump`):
   ```bash
   psql "$DATABASE_URL" -c '\dt'   # should list the Prisma tables
   ```
3. **Dump** (custom format — compressed, restorable table-by-table):
   ```bash
   mkdir -p /Volumes/rmoore-dev/abacus-archive-2026-08-23/db
   pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges \
     -f /Volumes/rmoore-dev/abacus-archive-2026-08-23/db/nightingale-prod-$(date +%F).dump
   ```
4. **Verify the dump is real, not empty:**
   ```bash
   pg_restore --list .../nightingale-prod-*.dump | head -30   # table of contents
   psql "$DATABASE_URL" -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
   ```
   Row counts from the second command are the checksum — record them in this doc.
5. **If `HOST` is not reachable from outside Abacus** (internal hostname, connection refused): run the same `pg_dump` from inside an Abacus agent session / the app VM, save the dump into the project files, and pull it out with the project export. Do not skip; find a path.
6. **Second copy** of the dump somewhere off the SSD (Dropbox is fine — it's user data, treat accordingly).

**Restore into the new database** (during step 4 of the plan):
```bash
pg_restore --no-owner --no-privileges -d "$NEW_DATABASE_URL" .../nightingale-prod-*.dump
psql "$NEW_DATABASE_URL" -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"  # counts must match
```

### Env capture runbook

> **Status (Rob, 2026-08-23):** UI harvest done. Eight values are hidden as "Reserved" in the
> Abacus UI; `NEXTAUTH_URL` does not exist there at all. Triage: `ABACUSAI_API_KEY`, `WEB_APP_ID`,
> and `NEXTAUTH_URL` are NOT needed (removed by the email rewrite / set fresh on the new host).
> `NEXTAUTH_SECRET` is optional — rotating it at cutover only forces a one-time re-login.
> `DATABASE_URL` and the three `AWS_*` values are being captured via the in-environment agent
> (printenv to `secrets-capture.txt` in project files), which bypasses the UI redaction.
> **RESOLVED (Rob, 2026-08-23): the S3 bucket is Abacus-provisioned.** Rob has no AWS account
> and never set one up — the "independent of Abacus, no action" line below is WRONG for S3.
> **User uploads must be rescued before cancellation**: the in-environment agent copies every
> object under `$AWS_FOLDER_PREFIX` into `uploads-rescue/` in the project files (the root-level
> `Uploads` folder may already hold them — verify by count). The new host needs its own object
> storage (R2 on the RMoore.dev Cloudflare account is the natural fit) and the upload code
> repointed — add to the migration plan.
> **UPDATE (2026-08-23, later):** both rescues are DONE in-environment and verified by the agent:
> `nightingale-prod-2026-08-23.dump` (132 KB, custom format, `pg_restore --list` shows all 8 schema
> tables with data) and `uploads-rescue/public/reports/` (6 user report images, 505,515 bytes,
> S3-to-local counts and bytes match). The root `Uploads/` folder proved to be brand/design assets,
> not the bucket. Rob downloads both to `/Volumes/rmoore-dev/abacus-archive-2026-08-23/`; local
> restorability check PASSED (2026-08-23 16:30 — pg_restore --list on the Mac shows 8/8 tables with data; uploads-rescue.zip 6 files / 505,515 bytes exact match). Full session-15 workspace zip also downloaded; DNS zone exports captured for BOTH nightingale.im and solovei.co.ua. Every irreplaceable Abacus-held asset is now local and verified — remaining before cancellation: the cosmetic rebrand run (blocked on the icon), the post-rebrand export/diff, and the migration itself. ⚠️ The dump contains real user data (accounts, session tokens, chat
> history) — keep it off synced/public storage; move to the encrypted NVMe when that lands. The new
> host still needs its own object storage (R2) with the 6 report images re-seeded and upload code
> repointed.
> Also resolved: NO Reserved value needs capturing anywhere. The DB dump is produced in-env
> without a human seeing `DATABASE_URL`; `NEXTAUTH_SECRET` is rotated at cutover (one forced
> re-login); the `AWS_*` values die with the bucket. The earlier `secrets-capture.txt` idea is
> withdrawn. Rob's Bitwarden harvest of the visible values completes env capture.

From the Abacus deployment config, copy the **production values** of every variable in `.env.example` into a password manager (Bitwarden) entry — not into a file in this repo:
`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ABACUSAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_FOLDER_PREFIX`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_CF_ANALYTICS_TOKEN`, `NOTIF_ID_WEBSITE_INQUIRY`, `NOTIF_ID_TUTORING_INQUIRY`,
`WEB_APP_ID`, `NOTIF_ID_CONTENT_REPORT`, `REPORT_RECIPIENT_EMAIL`.

(The last three were added 2026-08-23 after grepping the code: `app/api/report/route.ts` needs
them and the original 15-variable list missed them.)

~~Also confirm in code whether AI calls go through `ABACUSAI_API_KEY` (RouteLLM)…~~
**Resolved 2026-08-23 — they do not.** All AI calls already go direct to
`api.anthropic.com/v1/messages` via `lib/anthropic.ts` using `ANTHROPIC_API_KEY`. No provider
switch is needed. `ABACUSAI_API_KEY` is used as the `deployment_token` for Abacus's
**notification-email** API in `app/api/{contact,report,tutoring-inquiry}/route.ts` — those three
forms are what breaks at cancellation. See `docs/migration-status.md` §2.

Independent of Abacus (no action needed): S3 uploads bucket (AWS), Turnstile + web analytics (Cloudflare), Google OAuth client itself, the domain/DNS.

### Migration plan (separate code session)

1. Rebrand in Abacus done + project zip exported + synced/committed to `akaienso/nightingale` (sequencing steps 1–2)
2. DB dump + env capture done per runbooks above
3. Stand up new Postgres (Neon/Supabase, or Hyperdrive-fronted if going Cloudflare); restore dump; verify row counts match
4. Pick host: **Vercel** (least friction for Next.js 14 App Router + Prisma) or **Cloudflare Workers** via `@opennextjs/cloudflare` (keeps everything in the existing CF account; more build work, Prisma needs driver adapters). Deploy from `akaienso/nightingale`
5. ~~Deployment workflow: GitHub Actions on push to `main`…~~ **Superseded 2026-08-23** by the MMP release workflow: `feature/*` → PR → `develop` (beta) → PR → `main` (production), with release-please cutting releases on `main`. See `docs/CONTRIBUTING.md`.
6. Cutover: set `NEXTAUTH_URL`, Google OAuth redirect URIs, Turnstile domain for the new origin (and new domain, if the rebrand domain is ready); repoint DNS in Cloudflare (app subdomain origin + apex); verify login, translate, chat, and upload flows in production
7. Rehost or fold in the marketing site (currently Abacus-hosted at the apex)
8. **Only then: cancel Abacus**


## Rob's pre-cutover prep (manual, in Abacus + Cloudflare — nothing here switches traffic)

**Status 2026-08-23 (end of day):** no checklist items completed yet — all still open. **ALL brand assets are ON HOLD**: Rob is revising the icon, and the icon is a component of the wordmark, so every visual brand asset (icon, wordmark, favicons, app icon sets, in-app logo usage) is blocked until he delivers finals. Do not work on or ship anything brand-visual. The existing files in SOLOVEICO/brand/ are pre-revision reference only; the three soloveico webps referenced earlier are Dropbox-stranded and superseded. Non-visual rebrand work (name-string inventory, domain-surface classification) may proceed.

### Abacus web UI

- [ ] Open session 15 and answer the agent's five rebrand questions (new name, domain intent, Olia's name, upload soloveico wordmark/icon files, other changes). State explicitly: **cosmetic scope only — do not touch domain config, `NEXTAUTH_URL`, OAuth, or Turnstile.**
- [ ] Let the rebrand run, then smoke-test the deployed app: login, translate, chat, upload.
- [ ] Have the agent bump version + changelog (per session 12's discipline).
- [ ] Request the **full project zip export** and download it. **Explicitly ask the agent to
      include `package.json` and `yarn.lock`** — the 2026-08-21 `nightingale-v1.13.3.zip` export
      contained neither, and they are not in the git repo either. This blocks any build.
- [ ] In the same session, have the agent run the `pg_dump` command from the DB runbook *from inside the environment* and save the dump into the project files; download it (covers the internal-only DB host case).
- [ ] Copy **every** production env value from the deployment config into Bitwarden (15-variable list in the env-capture runbook). `DATABASE_URL` is the one that cannot be reconstructed later.
- [ ] Check the deployments/apps list for anything else running on Abacus (account also has ServiceSelfies and UARTF projects) — anything deployed dies at cancellation.
- [ ] Note the billing renewal date (= real deadline). Confirm no project-attached artifacts/files were missed by the 2026-08-23 conversation export.

### Cloudflare

- [ ] `nightingale.im` zone → export the DNS zone file; save to `/Volumes/rmoore-dev/abacus-archive-2026-08-23/` as the documented "before" state.
- [ ] Confirm and note the Abacus-pointing records: apex A `66.71.220.11`, and the origin behind the proxied `app` record.
- [ ] If the rebrand brings a new domain: register it and add its zone to Cloudflare **now** (NS propagation finishes before cutover day). Add no records yet.
- [ ] Day before cutover: drop TTL on the unproxied apex record to 5 min (proxied records don't need it).

### Google Cloud Console

- [ ] Screenshot the Nightingale OAuth client's current authorized redirect URIs (exact list needed when adding the new origin).
- [ ] Delete the retired rushomon OAuth client (its secret was scrubbed from git history 2026-08-23; the client is dead weight).

### Hand-back to Claude Code

- [ ] Give the project zip + DB dump to the code session: unzip, diff against `akaienso/nightingale`, commit the rebrand changes, stash the dump in the archive folder. Then the Migration plan (above) proceeds from step 2.
