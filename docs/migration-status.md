# Migration status — Claude Code session 1 (2026-08-23)

Companion to `docs/abacus-handover.md`. That doc is the *plan*; this one records what
was **verified against the code** in the first Claude Code session, and where the plan
turned out to be wrong.

Nothing was deployed, no DNS touched, no Abacus account access, no dependency changes.
Repo state at time of writing: `main` @ `1e37533`, clean tree, `APP_VERSION = 1.13.3`.

---

## 0. BLOCKER — the repo has no `package.json` and no `yarn.lock`

This is the single thing standing between the repo and a buildable/deployable project.

```
git ls-files | grep -i 'package\|lock'   ->  (nothing)
```

It is **not** gitignored — it was never committed. And it is not recoverable from the
most recent Abacus export either: `nightingale-v1.13.3.zip` (2026-08-21, session 15)
contains 448 files and **no manifest**. Abacus's zip export appears to omit it.

### Best available fallback

`~/workbench/Nightingale/Nightingale/nightingale-src.zip` (2026-07-20) **does** contain
both `package.json` (3868 B) and `yarn.lock` (459 KB). It is ~1 month stale relative to
v1.13.3, but the drift was measured and is tiny — see §1.

### Action for Rob (add to the Abacus prep checklist)

> When requesting the full project zip in session 15, **explicitly ask the agent to
> include `package.json` and `yarn.lock`** (or to `cat` them into the chat). The
> v1.13.3 zip did not contain them, so the default export will not either.

If that turns out to be impossible, the Jul-20 manifest + the one known delta in §1 is a
workable reconstruction, but it is a reconstruction — the lockfile would no longer match.

---

## 1. Goal 1 — orientation, `prisma generate`, typecheck

Both were run for real, in an isolated scratchpad copy of the tracked repo plus the
Jul-20 `package.json` (npm + `--legacy-peer-deps`, because `eslint@9.24.0` conflicts with
`@typescript-eslint/parser@7.0.0`'s `eslint@^8.56.0` peer — Yarn tolerates this, npm does not).
`yarn` is not installed on this machine and `corepack` is absent.

### `prisma generate` — PASSES with the default output path ✅

```
✔ Generated Prisma Client (v6.7.0) to ./node_modules/@prisma/client in 48ms
```

The 2026-08-23 removal of the hardcoded Abacus VM output path is confirmed good. One
non-blocking warning: Prisma 7 will require an explicit `output` — worth setting before
any Prisma major bump.

### `tsc --noEmit` — ONE error, and it is informative ✅/⚠️

```
app/components/translator-app.tsx(147,55): error TS2307:
  Cannot find module 'html2canvas' or its corresponding type declarations.
```

That is the *entire* Jul-20 → Aug-21 dependency drift. It is a **dynamic** import
(`await import('html2canvas')`), which is why a static import-vs-manifest diff comes back
clean — the whole repo has exactly one bare dynamic import and this is it.

**Conclusion: the code typechecks cleanly apart from one missing dependency,
`html2canvas`.** With that added, `tsc` is green. This matters because
`next.config.js` sets `typescript.ignoreBuildErrors = false` — a TS error fails the build.

### Other build-environment landmines found

- **`.yarnrc.yml` points at an Abacus VM path.** `globalFolder: /opt/hostedapp/node/yarn/global`
  does not exist on macOS or on Vercel/CF build images. Another VM artifact, same family
  as the Prisma `output` path that was already removed. Delete the line (or repoint it)
  before the first real install.
- **`next@14.2.28` carries a known security advisory** (npm flags it; see the
  2025-12-11 Next.js security update). Out of scope for this session per instruction,
  but it should be a deliberate decision before going live on a new host, not a drift.
- `next-env.d.ts` is untracked. Harmless — Next regenerates it.

---

## 2. Goal 2 — the AI provider path

### The handover doc's premise is wrong, in a good way

`docs/abacus-handover.md` says: *"confirm in code whether AI calls go through
`ABACUSAI_API_KEY` (RouteLLM) … Switch the AI provider path to direct Anthropic before
cutover."*

**They do not. The switch is already done.** Every AI call goes to
`https://api.anthropic.com/v1/messages` via `lib/anthropic.ts` using `ANTHROPIC_API_KEY`.
There is no RouteLLM endpoint, no OpenAI client, and no `@anthropic-ai/sdk` dependency
anywhere in the tree (the module is hand-rolled `fetch`). Verified by exhaustive grep for
`abacus`, `routellm`, `openai`, and `ANTHROPIC_API_KEY` across `app/`, `lib/`, `scripts/`.

| Route | Model | Call style |
|---|---|---|
| `app/api/translate/route.ts` | `HAIKU_MODEL` (`claude-haiku-4-5`) | `anthropicFetch` + `parseTextDeltas`, SSE |
| `app/api/chat/route.ts` | `ANTHROPIC_MODEL` (`claude-sonnet-5`) | `anthropicFetch` + `parseTextDeltas`, SSE |
| `app/api/translate-image/route.ts` | `ANTHROPIC_MODEL` | `anthropicComplete`, non-streaming |

**No provider-switch work is required. No dependency changes are required.**

### What `ABACUSAI_API_KEY` *is* actually used for — transactional email

This is the real Abacus coupling, and it was not in the plan. Three routes POST to
Abacus's notification-email service and die with the account:

| File | Line | Recipient |
|---|---|---|
| `app/api/contact/route.ts` | 59 | `hello@nightingale.im` |
| `app/api/report/route.ts` | 145 | `REPORT_RECIPIENT_EMAIL` \|\| `reports@nightingale.im` |
| `app/api/tutoring-inquiry/route.ts` | 56 | `olia@nightingale.im` |

All three call `POST https://apps.abacus.ai/api/sendNotificationEmail` with
`deployment_token: process.env.ABACUSAI_API_KEY`, plus `WEB_APP_ID` and a
`NOTIF_ID_*` per form. The response contract they depend on is
`{ success: boolean, notification_disabled?: boolean }`.

**These three forms silently break at cutover unless an email provider is chosen.**
Options, roughly in order of least friction: Resend, Postmark, AWS SES (an AWS account
already exists for S3), or Cloudflare Email Sending if the host ends up being Workers.
The blast radius is small and identical in all three files — one `sendNotification()`
helper in `lib/` replacing three inline `fetch` calls, then delete `WEB_APP_ID`,
`ABACUSAI_API_KEY` and the `NOTIF_ID_*` trio from the env surface.

**This is a decision for Rob, not a default I should pick.** Flagging, not guessing.

### Two more Abacus artifacts to strip

- **`app/layout.tsx:70`** — `<script src="https://apps.abacus.ai/chatllm/appllm-lib.js">`
  loads unconditionally, on every page, in production. It is an Abacus platform shim.
  It will 404 or worse once the account is gone; it is also a third-party script on a
  page that collects logins. Remove it.
- **`next.config.js:24–37`** — writes `__abacus_error_reporter.js` (a base64 blob that
  beacons client errors to `/__abacus/client-error`) into the webpack entry, but only
  when `NEXT_OUTPUT_MODE === 'standalone'`. Dead on any new host — nothing serves that
  endpoint. Remove the whole `if` block.

### Env surface: `.env.example` is incomplete

Referenced in code but **absent from `.env.example`**:
`WEB_APP_ID`, `NOTIF_ID_CONTENT_REPORT`, `REPORT_RECIPIENT_EMAIL`, `REPORT_PER_HOUR`,
`REPORT_PER_DAY`, and the six rate-limit knobs (`GUEST_TRANSLATE_PER_HOUR`,
`GUEST_TRANSLATE_PER_DAY`, `USER_TRANSLATE_PER_DAY`, `USER_IMAGE_PER_DAY`,
`USER_CHAT_PER_DAY`, and the guest/user pair in `lib/rate-limit.ts`).

The rate-limit ones have safe in-code defaults, so they are documentation gaps only.
`WEB_APP_ID` and `NOTIF_ID_CONTENT_REPORT` are **not** optional — the report form needs
them. **The env-capture runbook in the handover doc lists 15 variables and is missing
these two; capture them from Abacus too, or the report form cannot be reproduced.**

---

## 3. Goal 3 — rebrand surface inventory

Scope reminder from the handover doc: cosmetic can happen anywhere; **domain-shaped
config waits for the cutover.** The table below keeps that split.

Also note the sequencing: per the agreed plan the rebrand runs **inside Abacus first**,
and the export is then diffed into this repo. So this inventory is a **checklist to
verify the Abacus rebrand against**, not a work order to execute here — unless Rob
decides to reverse the sequencing.

### 3a. Naming — which spelling? ⚠️ OPEN QUESTION

The brand folder contains **three** spellings and there is a fourth in a document title:

- `brand/wordmark/soloveico-wordmark*.png` and `brand/assets/Soloveico-Bird.webp` → **Soloveico**
- `brand/icon/soleico-mark-*.png`, `soleico-mark.svg` → **Soleico**
- `content/why-soloveiko/Why Soloveiko.md` → **Soloveiko**
- `~/workbench/Nightingale/Translation Rules – solovei.co.ua.{md,pdf,docx}` → **solovei.co.ua**

All four are the same Ukrainian word (соловей / соловейко — "nightingale", which means
the *Why Nightingale* metaphor survives the rename intact). But the app can only have one
spelling, and the icon set is currently the odd one out. **Rob must pick one before
anything is renamed.**

### 3b. COSMETIC — safe to change anywhere

No central brand constant exists; the name is hardcoded in 42 files. Consider introducing
`lib/brand.ts` for the non-i18n call sites, though most occurrences are inside translated
strings and have to be edited literally.

| Area | Files / counts | Notes |
|---|---|---|
| **i18n strings** | `lib/i18n.ts` (148 "Nightingale", 44 "Olia", 22 Cyrillic `Оля`), `lib/i18n-es.ts` (68 / 42) | Bulk of the work. **`lib/i18n-es.ts` is a third locale that `CLAUDE.md` does not mention.** Top key groups: `site.*` 18, `why.*` 17, `terms.*` 16, `install.*` 16, `dev.*` 15 |
| **Changelog** | `lib/changelog.ts` (18 / 8) | Also: header comment says every item needs **en, uk AND es** — `CLAUDE.md` says only en+uk and is stale |
| **Page metadata** | `app/layout.tsx:16,31,44` | `title` / `openGraph` / `twitter`, all three: "Nightingale — Natural Ukrainian for Every Conversation" |
| **PWA manifest** | `public/manifest.json` | `name`, `short_name`, `description`, both icon `src` paths, `background_color`/`theme_color` `#397A5B` |
| **Service worker** | `public/sw.js` | 5 refs. **`CACHE_NAME = 'nightingale-v5'` must be bumped**, or returning users keep the old cached logos |
| **App components** | `translator-app.tsx` 13, `header.tsx` 5, `live-conversation-mode.tsx` 4, `image-translate-mode.tsx` 4, `loading-overlay.tsx` 2, `help-panel.tsx` 2, plus 6 more with 1 each | |
| **Static pages** | `app/why-nightingale/page.tsx` 11, `app/site/page.tsx` 8, `terms` 3, `privacy` 3, `changelog` 3, `legal` 2, `about-developer` 2, `auth/login` 2, `auth/signup` 2, `stand-with-ukraine` 1 | |
| **Model prompts** | `app/api/translate/route.ts:90,101,229`, `app/api/chat/route.ts:29`, `lib/ukrainian-purity.ts:19` | ⚠️ Persona text. `route.ts:101` reads *"you are simply Nightingale"* — the non-chat engine identifies itself by brand name to the model. Rename carefully; this changes model behaviour, not just pixels |
| **Route + asset path** | `/why-nightingale` → new slug; `public/why-nightingale/` (5 images incl. `hero-nightingale.jpg`); inbound links at `translator-app.tsx:530`, `site/page.tsx:130,423` | Add a redirect from the old path if it has any inbound links |
| **Image assets** | `public/nightingale-icon{,-light,-192,-512}.png`, `nightingale-wordmark{,-light}.png`, `nightingale-loading.mp4`, `og-image.png`, `favicon.{ico,svg}`, `favicon-{16,32}x{16,32}.png`, `apple-touch-icon.png`, `android-chrome-{192,512}.png` | Referenced 11× (`-icon.png`), 10× (`-icon-light.png`), 4×/4× (wordmarks) |
| **Palette** | `app/globals.css` — `--primary: 152 32% 33%` (light) / `150 36% 50%` (dark), `--accent: 34 52% 45%` / `36 55% 52%` | Only if the new brand changes colour. Never hardcode; edit the tokens |
| **Docs** | `README.md`, `CLAUDE.md`, `STYLE_GUIDE.md` | |

### 3c. DOMAIN-SHAPED — defer to cutover (handover step 6)

| Item | Location |
|---|---|
| Marketing-host rewrite | `middleware.ts:6` — `MARKETING_HOSTS = new Set(['nightingale.im', 'www.nightingale.im'])`. **Hardcoded; make it env-driven or it silently stops rewriting on the new apex** |
| Canonical app URL | `app/site/page.tsx:48` — `const APP_URL = 'https://app.nightingale.im'` |
| `NEXTAUTH_URL` | Also feeds `metadataBase` (`app/layout.tsx:15`) and the `appHost` fallback in all three email routes |
| Mailbox addresses | `support@` (`help-panel.tsx:177,181`), `hello@` (`contact/route.ts:69`), `reports@` (`report/route.ts:143`), `olia@` (`tutoring-inquiry/route.ts:66`), `privacy@` + `legal@` (i18n.ts:450,487,1128,1165; i18n-es.ts:444,481) |
| Google OAuth redirect URIs | Google Cloud Console |
| Turnstile widget domain | Cloudflare dashboard |
| DNS | Cloudflare — apex A + proxied `app` record |

### 3d. Brand assets — one gap ⚠️

The handover doc expects `soloveico-wordmark.webp`, `soloveico-icon.webp`,
`soloveico-icon-light.webp`. **None of the three exist.** What is actually on disk at
`~/workbench/Nightingale/SOLOVEICO/brand/`:

- `assets/` — `Soloveico-Bird.{psd,webp}`, `soloveico-bubble.{psd,webp}` ✅
- `wordmark/` — `soloveico-wordmark-{light,dark}.png` + `.psd` (PNG, not webp)
- `icon/` — `soleico-mark-{16,32,48,64,128,256,512}.png`, `soleico-mark{,-dark}.svg`,
  `app-icon-{192,512,dark-512,maskable-512}.png`, `apple-touch-icon-180.png`,
  `soloveico-icon{,-light}.psd`

So the **raster/vector coverage is actually better than expected** — a full icon set at
every size plus SVGs, and light/dark wordmarks. The webp files are simply not the format
that got produced. See the question at the end of this doc.

---

## 4. Goal 4 — host recommendation

### Recommendation: **Vercel**, and it is not close for this codebase.

The handover doc's sketch ("Vercel = least friction; Workers = keeps it in the CF
account, more build work") is directionally right, but the code makes the gap wider than
"more build work". Pressure-tested against what is actually in the tree:

**What makes Workers hard here**

1. **Prisma is the blocker.** `prisma/schema.prisma` has no `previewFeatures =
   ["driverAdapters"]`, and `lib/db.ts` is a plain `new PrismaClient()` singleton.
   Workers cannot open raw TCP to Postgres through the standard engine. Making it work
   means: enable `driverAdapters`, add `@prisma/adapter-pg` + `pg`, rewrite the client
   construction, and stand up **Hyperdrive** (or pay for Prisma Accelerate) in front of the
   new database. That is a schema change plus new dependencies plus new infrastructure —
   squarely outside "no dependency upgrades beyond what the provider switch strictly needs".
2. **NextAuth v4 + `@next-auth/prisma-adapter`** is the classic `@opennextjs/cloudflare`
   friction point. JWT sessions help (no session table reads on every request), but the
   Credentials provider's `authorize()` still hits Prisma on every login, and the adapter
   writes `Account`/`User` rows on every Google sign-in.
3. **bcryptjs on the login path.** Pure JS, so it runs — but it is deliberately
   CPU-expensive, and Workers meters CPU time. Login is the one route where that lands.
4. **`next.config.js` customises webpack output filenames** and reads `NEXT_OUTPUT_MODE`.
   OpenNext handles this, but it is one more thing to validate.

**What is genuinely fine either way** (so these are *not* arguments for Vercel):

- All 15 API routes are `export const dynamic = 'force-dynamic'` — no ISR/edge-cache
  semantics to preserve.
- SSE streaming (`translate`, `chat`) works on both.
- **No Node built-ins are imported anywhere** in `app/`, `lib/`, `components/` — verified
  by grep for `crypto`/`fs`/`path`/`stream`/`buffer`/etc. That is unusually clean.
- `@aws-sdk/client-s3` v3 works on Workers under `nodejs_compat`.
- Turnstile is a plain `fetch` to `siteverify`.
- `images: { unoptimized: true }` — no image-optimizer dependency on either host.
- `middleware.ts` is trivial (one host check, one rewrite) — no edge-runtime hazards.
- Public assets total ~16 MB with the largest file at 1.3 MB — under both hosts' limits.

**Why Vercel wins:** it runs this codebase *as written*, today, with zero code changes
beyond the `html2canvas` line and the Abacus strip-out. Next.js 14 App Router + Prisma +
NextAuth v4 is Vercel's most-trodden path. Given that the migration already has a
database move, an email-provider replacement, a rebrand, and a DNS cutover in flight,
adding a Prisma driver-adapter port and a Hyperdrive dependency to the same change window
is where this goes wrong.

**Counter-consideration, honestly stated:** DNS is already on Cloudflare, and the global
convention prefers keeping personally-licensed infrastructure in the personal `RMoore.dev`
Cloudflare account. Workers would consolidate. That is a real pull, and the right time to
revisit it is *after* a stable cutover — the app can move to Workers later from a working
baseline far more safely than during it. Nothing in this recommendation is one-way.

**Database:** Neon or Supabase, either works with Vercel. Neon's Postgres is the closer
match to a plain `pg_restore` of the Abacus dump.

**Marketing site:** no separate hosting decision needed. `middleware.ts` already serves
the apex from `app/site` in the same deployment — handover step 7 ("rehost or fold in the
marketing site") is already folded in. It only needs `MARKETING_HOSTS` updated.

---

## 5. Corrections to `docs/abacus-handover.md`

1. **"Switch the AI provider path to direct Anthropic before cutover"** — already done.
   No work item. The real Abacus coupling is transactional email (§2).
2. **The 15-variable env-capture list is short by two required vars** — add `WEB_APP_ID`
   and `NOTIF_ID_CONTENT_REPORT` (§2).
3. **Migration plan step 4** understates the Workers path: it needs a Prisma schema
   change and Hyperdrive, not just "driver adapters" (§4).
4. **Migration plan step 7** (marketing site) is already satisfied by `middleware.ts` (§4).
5. **Add to Rob's Abacus prep checklist:** explicitly request `package.json` +
   `yarn.lock` with the zip — the v1.13.3 export omitted them (§0).
6. **Add to Rob's prep checklist:** the brand assets are PNG/SVG/PSD, not the expected
   webp trio (§3d).

---

## 6. Suggested order of work from here

1. Rob answers the open questions at the end of this doc.
2. Abacus rebrand runs (cosmetic scope only) → project zip **with manifest** → DB dump →
   env capture. *(Rob, in the Abacus UI.)*
3. Sync the zip into this repo; diff against `main`; commit. Verify the rebrand against
   the §3 checklist and close whatever the Abacus agent missed.
4. Strip Abacus: the `layout.tsx` script tag, the `next.config.js` error-reporter block,
   the `.yarnrc.yml` `globalFolder` line, and the three email routes → new provider.
5. Add `html2canvas`; confirm `tsc --noEmit` is green and `next build` succeeds locally.
6. New Postgres + restore + row-count verification.
7. Vercel project from `akaienso/nightingale`; env vars; preview deploy; smoke-test
   login / translate / chat / image-upload / all three forms against the preview URL.
8. Cutover (handover step 6), then step 7 is already done, then cancel Abacus.

No version bump or changelog entry accompanies this commit: it is documentation only,
with no user-facing change. Per `lib/changelog.ts`, the next release that ships the
rebrand needs **en, uk and es** text for every item.

---

## Open questions for Rob

1. **Which spelling?** Soloveico / Soleico / Soloveiko — all three are in the brand
   folder, and `solovei.co.ua` appears in the translation-rules docs. Related: is the new
   domain `solovei.co.ua`, or something else? (§3a)
2. **Does Olia stay Olia?** This was one of session 15's five unanswered questions. She is
   named after a real person, `olia@nightingale.im` is a live mailbox, and her name is
   baked into the model prompts in both English and Cyrillic (`Оля`). My read is she
   should stay — the trademark issue was with "Nightingale", not with her — but it is
   your call. (§3b)
3. **Email provider for the three forms?** Resend / Postmark / SES / Cloudflare. This is
   a hard dependency for cutover — the contact, report, and tutoring-inquiry forms all
   break when the Abacus account closes. (§2)
4. **The three `*.webp` brand files do not exist** — the wordmark shipped as PNG and the
   icons as PNG+SVG+PSD. Are the webp versions still stuck as Dropbox online-only files,
   or should the existing PNG/SVG set simply be used? The PNG/SVG coverage looks complete
   to me. (§3d)
5. **Which items on your Abacus/Cloudflare/Google prep checklist are already done?** I
   have deliberately acted on none of them. (handover doc §"Rob's pre-cutover prep")
