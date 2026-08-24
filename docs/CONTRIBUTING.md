# Contributing — branches, commits, releases

This repo follows the standard Member Minder Pro release workflow.

## Branch flow

```
feature/*  ─PR─>  develop  ─PR─>  main
                     │               │
                    beta         production
```

- **`main` is production.** Vercel treats it as the production branch. A merge to
  `main` ships to users.
- **`develop` is beta.** It auto-deploys to the beta deployment for verification.
- **Feature branches** cut from `develop` and PR back into `develop`. Never into `main`.
- **Promotion to production** is `develop → main`, by PR.

> ⚠️ **`main` is no longer "push to deploy".** Pushing to `main` is a production release.
> Direct pushes to `main` and `develop` are blocked by branch protection; everything
> mergeable goes through a PR.

### Deploy map

| Branch | Deployment | Trigger |
|---|---|---|
| `feature/*` | Vercel preview (per PR) | opening/updating a PR |
| `develop` | **beta** | merge to `develop` |
| `main` | **production** | merge to `main` |

## Commit format — Conventional Commits, required

Every mergeable commit must follow [Conventional Commits](https://www.conventionalcommits.org/).
This is not cosmetic: release-please derives the version bump and the developer
changelog from these messages. A non-conforming commit is invisible to the release.

```
<type>(<optional scope>): <description>

[optional body]

[optional footer]
```

| Type | Effect on version | Use for |
|---|---|---|
| `feat:` | **minor** (1.13.3 → 1.14.0) | a new capability |
| `fix:` | **patch** (1.13.3 → 1.13.4) | a bug fix |
| `perf:` | patch | performance work |
| `docs:` | none | documentation only |
| `refactor:` | none | no behaviour change |
| `test:` | none | tests |
| `build:` / `ci:` | none | build system, pipelines |
| `chore:` | none | dependency bumps, housekeeping |
| `revert:` | patch | reverting a previous commit |

**Breaking changes** bump **major**: add `!` after the type (`feat!:`) or a
`BREAKING CHANGE:` footer.

Examples from this repo's history, retro-fitted to the convention:

```
feat(history): load a history entry into the translate tab on click
fix(upload): send PDFs as a document block, not an image block
chore(deps): bump next 14.2.28 -> 14.2.35
docs: add the cutover runbook
```

No AI/assistant attribution in commit messages or PR bodies — see `CLAUDE.md`.

## Two changelogs, two audiences, two triggers

This is the part that is easy to get wrong. There are **two** changelogs and they are
not copies of each other.

| | `CHANGELOG.md` + GitHub Releases | `lib/changelog.ts` |
|---|---|---|
| **Audience** | developers | end users, in the app at `/changelog` |
| **Owner** | release-please, automatic | a human, deliberate |
| **Trigger** | **every** release | only releases users can perceive |
| **Content** | every conventional commit | plain-language description of what changed for them |
| **Languages** | English | **en + uk + es**, all three required |

### The developer changelog — automatic

release-please runs on `main`. It opens a release PR that accumulates conventional
commits; merging that PR cuts the release, tags it, writes `CHANGELOG.md`, and publishes
a GitHub Release. Nothing to do by hand.

It also updates the version in two places automatically:

- `package.json` → `version`
- `lib/changelog.ts` → `APP_VERSION`, via the `// x-release-please-version` annotation
  on that line. **Do not remove that comment** and do not hand-edit `APP_VERSION`.

### The user-facing changelog — deliberate

`lib/changelog.ts` gets an entry **only when a release changes how users experience the
app**: a new capability, changed behaviour, or a visible fix.

**Skip it entirely for dev-only releases** — dependency bumps, refactors, infrastructure,
CI, documentation. A user has no way to perceive those and does not benefit from reading
about them.

> **A consequence worth stating plainly, because it looks like a bug:** the in-app
> changelog will legitimately **skip version numbers**. If 1.14.0 is a dependency bump and
> 1.15.0 adds a feature, users see 1.13.3 then 1.15.0. **That is correct.** `APP_VERSION`
> still follows release-please either way — the two stay in lockstep on version, and
> diverge only on which releases are worth telling users about.

When an entry *is* warranted, add it to the top of the `CHANGELOG` array with **`en`, `uk`
and `es` text for every item** — all three are required, and the file will not typecheck
without them.

**Ukrainian must be reviewed by Rob before merge.** Write it natural rather than literal;
a machine-literal rendering is not acceptable in a product whose entire premise is
colloquial Ukrainian. Flag it in the PR description so it gets read.

Also note the standing rule in `CLAUDE.md`: **Olia stays Olia and Оля stays Оля** — never
convert between them, in changelog text or anywhere else.

## Before opening a PR

```bash
yarn install --immutable
yarn prisma generate     # only after schema changes
yarn tsc --noEmit        # MUST pass — TS errors fail the build
yarn build
```

`yarn lint` is advisory: ESLint errors do **not** fail the build
(`next.config.js: eslint.ignoreDuringBuilds = true`), but **TypeScript errors do**
(`typescript.ignoreBuildErrors = false`). Do not rely on lint to catch a bad merge.

Yarn is pinned to 4.18.0 via `packageManager`. Corepack honours it on Vercel and in CI;
locally you may need `npm i -g corepack` or an explicit Yarn 4.18.0 invocation.

## Release checklist (`develop → main`)

1. Beta deployment verified.
2. Open the `develop → main` PR.
3. Merge. release-please opens a release PR against `main`.
4. Decide: does this release change anything a user can perceive?
   - **Yes** → add the `lib/changelog.ts` entry (en/uk/es, Ukrainian reviewed) *before*
     merging the release PR, so the app and the release agree.
   - **No** → merge the release PR as-is. Skipping the in-app entry is correct.
5. Merge the release PR. The tag, GitHub Release and `CHANGELOG.md` are written for you.
