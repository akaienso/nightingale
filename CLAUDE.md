# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nightingale** — a Next.js 14 (App Router) web app for natural, colloquial Ukrainian ↔ English translation with cultural context. The in-app AI guide persona is **Olia** (Оля). This is a learning / professional-development project, not a production service at this repo.

## Commands

Package manager is **Yarn** (Berry, see `.yarnrc.yml`). There is no test suite.

```bash
yarn dev            # dev server on :3000
yarn build          # production build
yarn start          # run production build
yarn lint           # next lint (ESLint)

yarn prisma generate   # regenerate Prisma client (run after schema changes)
yarn prisma db push    # sync schema.prisma -> database (no migrations dir)
yarn prisma db seed    # runs scripts/safe-seed.ts via tsx
```

Local setup requires a PostgreSQL `DATABASE_URL`, plus `NEXTAUTH_SECRET` and `NEXTAUTH_URL`. Copy `.env.example` → `.env`. AI, Google sign-in, S3 upload, and Turnstile keys are all optional — the app runs without them, only the corresponding features go dark.

## Build gotchas

- **ESLint errors do NOT fail the build** (`next.config.js: eslint.ignoreDuringBuilds = true`), but **TypeScript errors DO** (`typescript.ignoreBuildErrors = false`). Type-check your changes; don't rely on lint blocking a bad merge.
- `prisma/schema.prisma` generates the client to the default `node_modules/.prisma/client` (the hardcoded Abacus VM output path was removed 2026-08-23 — see `docs/abacus-handover.md`).
- Build output dir and mode are env-overridable: `NEXT_DIST_DIR` (default `.next`), `NEXT_OUTPUT_MODE`. `tsconfig.json` includes both `.next/` and `.build/` types.
- Import alias: `@/*` maps to the project root (`./`), e.g. `@/lib/anthropic`, `@/components/ui/button`.

## Architecture

### Request flow for AI features
`app/api/translate` (and `translate-image`, `chat`) are the AI entry points. The pattern in `app/api/translate/route.ts` is the canonical one:

1. **Rate-limit shield first** (`lib/rate-limit.ts`) — a DB-backed limiter (`RateLimit` table) caps expensive LLM calls *before* the model is called. Guests capped by IP (`getClientIp`), signed-in users by account id. Limits are tunable via env (`GUEST_TRANSLATE_PER_HOUR`, `USER_TRANSLATE_PER_DAY`, etc.).
2. **Settings-derived system prompt** — `buildSystemPrompt(body)` assembles Olia's persona + translation rules from the request's settings (direction, Ukrainian dialect, English variety, speaker/addressee gender, formality, output style, message format/medium, emoji toggle, UI language). This is the heart of translation behavior; changing tone/rules happens here, not in the model config.
3. **Streaming** — responses stream to the client as SSE. The route parses Anthropic deltas via `parseTextDeltas` and re-emits its own `{status, partial}` / `{status:'completed', result}` events. Final text is coerced to JSON via `extractJson` (models return `{translation, culturalNote}` as raw JSON).

### `lib/anthropic.ts` — the model client
Calls the Anthropic **Messages API** directly (`api.anthropic.com/v1/messages`), NOT an SDK. Key adaptations (the app was originally written against an OpenAI-style chat/completions API):
- System prompt is a top-level `system` param, not a message. `toAnthropicMessages()` splits OpenAI-style message lists and drops leading assistant turns (Anthropic requires the first message be `user`).
- Models: `ANTHROPIC_MODEL = claude-sonnet-5` (chat), `HAIKU_MODEL = claude-haiku-4-5` (the two-panel translator — cheaper/faster, still gets the full system prompt).
- **Do not send `temperature`** — Sonnet 5 rejects it with a 400. `buildBody` intentionally omits it.
- The static system block is sent with `cache_control: ephemeral` for prompt caching.
- Env key is `ANTHROPIC_API_KEY` (`.env.example` also lists a legacy `ABACUSAI_API_KEY`).

### Auth (`lib/auth.ts`)
NextAuth with **JWT sessions** (not DB sessions), Prisma adapter. Two providers: Credentials (bcrypt + Turnstile bot-check in `authorize`) and Google OAuth. The user id is threaded into the JWT and session via callbacks — read it as `(session.user as {id}).id`.

### Middleware (`middleware.ts`)
Host-based rewrite: requests to `nightingale.im` / `www.nightingale.im` at path `/` are rewritten to `app/site` (the marketing one-pager). Everything else serves the app. Reads host from `x-forwarded-host` first (behind Cloudflare/proxy). Runs on root path only; skips `/api`, `_next`, static assets.

### Client app shell
`app/components/translator-app.tsx` is the top-level client component. It manages `TranslationMode` (`panel` | `chat` | `conversation` | `image`) and a `TranslationSettings` object. Settings persist to localStorage for guests and **sync to the account** (source of truth) for signed-in users via `app/api/account`. Chat, live-conversation, and image modes require auth (`AUTH_REQUIRED_MODES`). Live Conversation is experimental and only enabled on the `abacusai.app` dev host.

Note: UI label "Output Style" is stored internally as `outputFormat`, and UI "Output Format" (delivery medium) is `messageFormat` — the mismatch is deliberate to avoid migrating persisted settings and `TranslationHistory` rows.

### Data model (`prisma/schema.prisma`, PostgreSQL)
Standard NextAuth tables (`User`, `Account`, `Session`, `VerificationToken`) plus: `User.settings` (Json, synced prefs) and `preferredName`/`bio`; `TranslationHistory`; `ChatConversation` → `ChatMessage`; `RateLimit` (the limiter's buckets).

### i18n
`lib/i18n.ts` holds the EN/UK dictionary and the `translate` helper, and `lib/i18n-es.ts` holds the Spanish one; `components/i18n-provider.tsx` exposes `useI18n()` (`t`, `lang`, `setLang`). UI language is separate from translation direction, and it controls which language cultural notes are written in.

### Changelog / versioning
There are **two** changelogs. See `docs/CONTRIBUTING.md` for the full model.

- `CHANGELOG.md` + GitHub Releases — **developer-facing, owned by release-please**, written
  automatically from conventional commits on every release.
- `lib/changelog.ts` — **user-facing**, rendered at `/changelog`. Add an entry only when a
  release changes what users experience; skip it entirely for dependency bumps, refactors
  and infra. Every item needs `en`, `uk` **and `es`** text, and the Ukrainian is reviewed by
  Rob before merge.

**Do not hand-edit `APP_VERSION`.** release-please owns it via the
`// x-release-please-version` annotation on that line, keeping it in step with
`package.json`. Because dev-only releases get no in-app entry, the user-facing log will
legitimately skip version numbers — that is correct, not an omission.

## UI conventions

Read `STYLE_GUIDE.md` before building UI. Key points:
- **shadcn/ui** primitives in `components/ui/` (config in `components.json`); app-feature components in `app/components/`; reusable layout wrappers in `components/layouts/`.
- Fonts: `font-sans` (DM Sans, body), `font-display` (Plus Jakarta Sans, headings), `font-mono` (JetBrains Mono, numeric/IDs). Configured in `app/layout.tsx`.
- **Never hardcode colors** — use the CSS-variable design tokens (`bg-primary`, `text-muted-foreground`, `border-border`, …). Same for spacing (8px grid), radius, shadows.
- Do not remove providers from `app/layout.tsx` without reason — `ChunkLoadErrorHandler` in particular guards a known ChunkLoadError race.

## Brand names — Soloveico, and the Olia rule

A rebrand from "Nightingale" to **Soloveico** is in flight (trademark conflict). Status
and the full surface inventory live in `docs/migration-status.md`.

- **Soloveico** — the brand name in Latin characters. **Соловейко** — the Cyrillic form.
  **solovei.co.ua** — the domain. "soloveyko" / "soloveiko" / "so-lo-VEY-ko" are valid
  phonetic spellings in their own contexts; do not normalise them to each other.
- **"Soleico" is a typo** (the "ov" was dropped after the L). It appears only in the
  filenames `brand/icon/soleico-mark-*.png|svg` outside this repo. Never introduce it.

### ⛔ Olia and Оля — never convert between them

**Olia stays Olia. Оля stays Оля.** Each appears in the form it does deliberately. Never
transliterate, "normalise", or unify the two, in either direction, and never change
either one without Rob's direct consent — not during the rebrand, not as a consistency
fix, not as a cleanup. This covers `lib/i18n.ts`, `lib/i18n-es.ts`, the model prompts in
`app/api/{translate,chat}/route.ts`, `lib/verify-translation.ts`, `lib/changelog.ts`,
the `olia-*` asset filenames, and the `olia@` mailbox.

The trademark conflict was with "Nightingale". It has nothing to do with Olia. The same
care applies to all Ukrainian text in this repo: preserve it exactly.

## Company / naming

Per global instructions: company is **Member Minder Pro, LLC** (three words, never "MemberMinder"). No AI/Claude attribution in any commits or PRs.

This project **is** a git repository — `github.com/akaienso/nightingale`. (An earlier note
here said otherwise; that was true only while the code lived in the Abacus VM.)

**Branch flow — read `docs/CONTRIBUTING.md` before committing.** `feature/*` → PR →
`develop` (beta) → PR → `main` (**production**). `main` is not a working branch and not
"push to deploy": a merge to `main` ships to users. Direct pushes to both protected
branches are blocked. **Conventional Commits are required** on everything mergeable —
release-please derives the version and changelog from them, so a non-conforming commit is
invisible to the release.
