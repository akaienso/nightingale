# Cutover runbook — Abacus → Vercel + Neon

**Same-domain cutover. The app goes live as `nightingale.im`, unrebranded.**
Rebrand and the `solovei.co.ua` move are phase 2, done entirely in this repo.

Deadline: Abacus renews in ~24h (from 2026-08-23 evening) and is being cancelled.

Steps 1–6 change nothing users can see. **Step 7 is the only irreversible one and needs
Rob's explicit go.**

---

## Pre-flight — already true, no action

| | |
|---|---|
| Repo builds | clean install → `tsc` clean → `next build` green, verified on a wiped tree |
| Abacus code coupling | gone — email on Cloudflare, uploads on R2, both platform artifacts stripped |
| Data rescue | `nightingale-prod-2026-08-23.dump` (8/8 tables) + 6 upload objects, verified local |
| Email Routing | already configured on the RMoore.dev account, catch-all to Rob |
| DNS | both zones already on Cloudflare in the RMoore.dev account; zone files exported |

### The apex is not a separate problem ✅

Verified 2026-08-23 against the live site: `nightingale.im` serves
`/_next/static/chunks/117-760cd612.js` and `fd9d1056-8e0367ad.js` — the **same chunk
hashes this repo produces locally** — and `nightingale.im/changelog` returns the app.

The apex and `app.nightingale.im` are **one deployment**. `middleware.ts` rewrites `/` to
`app/site` when the host is `nightingale.im` or `www.nightingale.im`; everything else
serves the app. So at step 7 both hostnames point at the same Vercel project, and the
marketing site comes along for free. Nothing extra to host.

---

## 1. Neon — create the database

1. Sign up at neon.tech. Create a project, region close to the Vercel region.
2. Postgres 16+. Database name `nightingale`.
3. From the dashboard, copy **both** connection strings:
   - **Pooled** (host contains `-pooler`) → this becomes `DATABASE_URL` on Vercel.
   - **Direct / unpooled** → used only for the restore in step 2.

> ⚠️ **Restore over the direct URL, not the pooled one.** The pooler runs in transaction
> mode, which breaks `pg_restore`'s session-level operations in confusing, partial ways.
> Serve traffic pooled; do surgery direct.
>
> **Correction (2026-08-23):** Neon's console now issues **one** string, and it is the
> **direct** one — there is no `-pooler` in the hostname to remove. The pooled endpoint is
> derived by **adding** `-pooler` to the endpoint id:
> `ep-<id>-pooler.<rest>`. Both hostnames were confirmed to resolve. So the derivation runs
> the opposite way from what the console implies: restore over the string as issued, and
> add `-pooler` for the runtime `DATABASE_URL`.

Both need `?sslmode=require`.

## 2. Restore and verify

`pg_restore` lives at `/opt/homebrew/opt/libpq/bin` (not on PATH by default).

```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
DUMP=/Volumes/rmoore-dev/abacus-archive-2026-08-23/recovery-assets/nightingale-prod-2026-08-23.dump
DIRECT='postgresql://...neon.tech/nightingale?sslmode=require'   # UNPOOLED

pg_restore --no-owner --no-privileges --no-acl -d "$DIRECT" "$DUMP"
```

`--no-owner`/`--no-privileges` matter: the dump's objects are owned by
`role_118f913648`, an Abacus role that does not exist in Neon.

**Verify — this is the checksum for the whole migration:**

```bash
psql "$DIRECT" -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname;"
psql "$DIRECT" -c '\dt'
```

Expect all 8 tables: `Account`, `ChatConversation`, `ChatMessage`, `RateLimit`,
`Session`, `TranslationHistory`, `User`, `VerificationToken`. Record the counts here:

**✅ RESTORED AND VERIFIED 2026-08-23.** Target: Neon project `neondb`, PostgreSQL 18.6,
`us-east-2`. `pg_restore` completed with zero errors.

| Table | Rows |
|---|---|
| Account | 2 |
| ChatConversation | 24 |
| ChatMessage | 88 |
| RateLimit | 103 |
| Session | 0 |
| TranslationHistory | 379 |
| User | 133 |
| VerificationToken | 0 |

Counts are `SELECT count(*)`, not `n_live_tup` estimates. `Session` and
`VerificationToken` being empty is expected and correct — sessions are JWT, so the table is
vestigial, and verification tokens are short-lived.

Structure also checked: **8/8 tables, 17 indexes, 5 foreign keys.**

**Schema matches `prisma/schema.prisma`** — verified with `prisma db pull --print`. The only
diffs are field ordering and `@db.Text` attributes that `db pull` omits because `text` is
already Prisma's default mapping for `String` on PostgreSQL. Confirmed against
`information_schema`: every string column is `text`, and there is not one `varchar` in the
database. **No `db push` was run and none is needed.**

Final check — the app's own Prisma client against the restored data: 133 users, 379
translations, 24 conversations, 131 credentials users, 2 Google-linked accounts, sample row
readable.

If `n_live_tup` reads 0 on a table you know has rows, run `ANALYZE;` — it is a stats
estimate, not a count. `SELECT count(*)` is the authority.

**Do not run `prisma db push`.** The schema comes from the dump. Confirm they agree with
`npx prisma db pull --print` compared against `prisma/schema.prisma`, and stop if they
diverge rather than letting `db push` reconcile it — `db push` can drop columns.

## 3. Vercel — create the project

1. Sign up, **Add New → Project**, import `akaienso/nightingale`.
2. Framework preset: Next.js. Build/install commands: **leave as detected.** Corepack
   honours the pinned `packageManager: yarn@4.18.0`, and `enableScripts: true` means the
   Prisma client generates during install with no extra build step.
3. **Do not add a domain yet.** Deploy to the generated `*.vercel.app` URL only.

### Environment variables

Set for **Production, Preview and Development**. Visible values come from Rob's Bitwarden;
see `.env.example` for the full annotated surface.

| Variable | Value for now |
|---|---|
| `DATABASE_URL` | Neon **pooled** string, `?sslmode=require` |
| `NEXTAUTH_SECRET` | **freshly generated** — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | the `*.vercel.app` URL for now; becomes `https://app.nightingale.im` at step 7 |
| `ANTHROPIC_API_KEY` | Bitwarden |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Bitwarden |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Bitwarden |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Bitwarden (optional) |
| `MAIL_DOMAIN` | `nightingale.im` |
| `CF_ACCOUNT_ID` | `5d39aea8832f48a8dc808afd97d9a29c` |
| `CF_EMAIL_API_TOKEN` | step 4 |
| `R2_*` | step 5 — see `docs/r2-setup.md` |

`MAIL_FROM`, `MAIL_FROM_NAME`, and the three `*_RECIPIENT_EMAIL` overrides can stay unset;
they default off `MAIL_DOMAIN`.

> **A fresh `NEXTAUTH_SECRET` logs everyone out once.** Sessions are JWT, so rotating the
> signing key invalidates existing tokens. Accounts, history and chats are untouched —
> users just sign in again. This is the right trade versus carrying a secret that lived in
> a system being cancelled.

### Google OAuth — needed before login works on preview

In Google Cloud Console, add to the OAuth client's **Authorized redirect URIs**:

```
https://<your-project>.vercel.app/api/auth/callback/google
```

Keep the existing `https://app.nightingale.im/api/auth/callback/google` — it is still the
production one after cutover. Adding is non-destructive; do not remove anything.

### Turnstile — same story, easy to miss

The widget validates the **hostname**. Add the `*.vercel.app` preview host to the
Turnstile widget's allowed hostnames, or **login and signup will fail on preview** and
look like a credentials bug. Cloudflare dashboard → Turnstile → the widget → Hostnames.

## 4. Cloudflare Email Sending — onboard `nightingale.im`

Not `solovei.co.ua` — that is phase 2.

```bash
npx wrangler email sending enable nightingale.im
npx wrangler email sending dns get nightingale.im     # verify records landed
```

SPF and DKIM are auto-configured. **DMARC is not** — add manually:

```
_dmarc.nightingale.im  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@nightingale.im"
```

Then create an API token with email-sending permission scoped to the RMoore.dev account →
`CF_EMAIL_API_TOKEN`.

Note `wrangler login` needs a **local** browser and a localhost callback. Safari's
HTTPS-Only mode blocks that — use `--browser=false` and paste the URL into Chrome.

## 5. R2 — object storage

Full runbook in **`docs/r2-setup.md`**. Cowork can create the bucket in the RMoore.dev
account on request. Short version: create bucket → enable public access (custom domain or
r2.dev) → bucket-scoped S3 API token → set the six `R2_*` variables.

Re-seeding the six rescued images is **optional and archival** — no object URL is stored
in the database, so it repairs nothing. Details in that doc.

## 6. Verify everything on the preview URL — before any DNS change

Run against `https://<project>.vercel.app`. Do not skip the forms; they are the newest code.

| # | Check | Watch for |
|---|---|---|
| 1 | Sign up with email | Turnstile renders and passes (needs step 3's hostname) |
| 2 | Log in / log out | fresh `NEXTAUTH_SECRET` in play |
| 3 | Log in with Google | needs step 3's redirect URI |
| 4 | Existing account from the dump logs in | proves the restore + bcrypt hashes survived |
| 5 | Translate (panel) | SSE stream renders progressively, not one blob at the end |
| 6 | Chat with Olia | streaming + conversation persists to Neon |
| 7 | History shows restored rows | proves reads against real migrated data |
| 8 | Image translate — upload | R2 presigned PUT; needs matching `Content-Type` |
| 9 | Contact form | **new code path** — mail arrives, correct From/Reply-To |
| 10 | Tutoring inquiry | **new code path** |
| 11 | Content report **with screenshot** | **fullest path** — R2 buffer upload + public URL + image renders in the email |
| 12 | `/site` directly | the marketing page |
| 13 | `/changelog`, `/why-nightingale`, `/privacy`, `/terms` | render |

> ⚠️ **The apex rewrite cannot be tested on preview.** `middleware.ts` only rewrites `/`
> to `/site` for hosts `nightingale.im` / `www.nightingale.im`. On a `*.vercel.app` host
> the root correctly serves the app instead. Visit `/site` directly to check the marketing
> page; the rewrite itself is only observable after step 7.

If email fails, the log line names the reason — `misconfigured` (env vars absent),
`rejected` (token/domain), `bounced`, or `network`. That distinction was built in for
exactly this moment.

## 7. DNS cutover — Rob confirms explicitly, last step

**Nothing here runs without Rob saying go.**

1. In Vercel: add domains `app.nightingale.im`, `nightingale.im`, `www.nightingale.im` to
   the project. Vercel shows the target records.
2. Set `NEXTAUTH_URL=https://app.nightingale.im` and redeploy.
3. Cloudflare DNS: repoint `app` (currently proxied to the Abacus origin) and the apex A
   record (currently `66.71.220.11`) to Vercel's targets.
4. **Drop TTL to 5 min on the unproxied apex beforehand** — proxied records do not need it.
5. Cloudflare **SSL/TLS mode must be Full (strict)**. Flexible causes a redirect loop with
   Vercel. If Vercel's domain verification stalls behind the orange cloud, grey-cloud the
   record until the certificate issues, then re-enable the proxy.
6. Re-run the step 6 checklist against the real hostnames, and confirm the apex rewrite now
   serves the marketing page at `/`.

Rollback: the Abacus records are in the exported zone files in
`/Volumes/rmoore-dev/abacus-archive-2026-08-23/`. Valid only while the Abacus account is
still alive — **which is the real reason to verify hard at step 6.**

## 8. Only then cancel Abacus

After step 7 verifies clean. Confirm nothing else in the account is still serving —
it also held ServiceSelfies and UARTF projects.
