# R2 setup — object storage for uploads

Short runbook for standing up the bucket the app's upload code now points at.
Do this in the **personal `RMoore.dev` Cloudflare account**
(`5d39aea8832f48a8dc808afd97d9a29c`) — same account as the domains and Email Sending.

**Why R2 at all:** the previous S3 bucket was Abacus-provisioned. Rob has no AWS account
and never created one, so that bucket dies with the Abacus subscription. The handover
doc's "S3 is independent of Abacus, no action needed" line was wrong; the six user report
images in it were rescued on 2026-08-23 and verified locally.

## 1. Create the bucket

Dashboard → **R2** → *Create bucket*. Or:

```bash
npx wrangler r2 bucket create nightingale-uploads
```

Name it for the app, not the brand-in-flight — or accept renaming it later. Location hint
`ENAM`/`WEUR` is optional; R2 has no egress fee, so this is a latency choice only.

## 2. Enable public access

Two of the three code paths serve objects **without** a signature (`getFileUrl(..., isPublic)`
and the report screenshots), so the bucket needs a public hostname.

Bucket → **Settings** → *Public access*. Either:

- **Custom domain** (preferred) — e.g. `uploads.solovei.co.ua`. The zone is already in this
  account, so it is a one-click bind. Stable, brandable, and cacheable on the CDN.
- **r2.dev subdomain** — fine to start, but Cloudflare rate-limits it and it is not meant
  for production traffic.

Whichever you pick becomes `R2_PUBLIC_BASE_URL` (no trailing slash).

> ⚠️ **A custom domain does not replace the S3 endpoint.** Presigned URLs work *only* on
> `<account_id>.r2.cloudflarestorage.com` and are rejected on custom domains. The code
> keeps the two separate for exactly this reason — `R2_PUBLIC_BASE_URL` for unsigned public
> reads, the account endpoint for everything signed.

## 3. Create an S3 API token

R2 → **API** → *Manage API tokens* → *Create API token*.

- Permission: **Object Read & Write**
- Scope it to **this bucket only**, not "all buckets"
- TTL: whatever you are willing to rotate

It returns an **Access Key ID** and **Secret Access Key** — shown once. Put both in
Bitwarden immediately. These are S3 credentials, distinct from the
`CF_EMAIL_API_TOKEN` used for Email Sending; do not reuse one for the other.

## 4. Environment variables

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | `5d39aea8832f48a8dc808afd97d9a29c` (optional — falls back to `CF_ACCOUNT_ID`) |
| `R2_ACCESS_KEY_ID` | from step 3 |
| `R2_SECRET_ACCESS_KEY` | from step 3 |
| `R2_BUCKET_NAME` | e.g. `nightingale-uploads` |
| `R2_FOLDER_PREFIX` | optional key prefix; leave empty unless mirroring the old layout |
| `R2_PUBLIC_BASE_URL` | from step 2, no trailing slash |

The old `AWS_REGION` / `AWS_BUCKET_NAME` / `AWS_FOLDER_PREFIX` are gone — no code reads
them any more.

## 5. Re-seed the six rescued report images (optional)

From `/Volumes/rmoore-dev/abacus-archive-2026-08-23/` (`uploads-rescue/public/reports/`,
6 files, 505,515 bytes, verified):

```bash
for f in uploads-rescue/public/reports/*; do
  npx wrangler r2 object put "nightingale-uploads/public/reports/$(basename "$f")" --file "$f"
done
```

**Be clear about what this does and doesn't buy.** No storage path or object URL is
persisted anywhere in the database — the schema has no reports table, and `screenshotUrl`
only ever travels in the outgoing email. So those six URLs exist solely inside report
emails already sitting in Rob's inbox, and those links point at the old AWS host, which
will be dead. Re-seeding does **not** repair them. It is archival: it keeps the images
reachable at a stable URL you control. If that is not wanted, keeping the verified local
copy is a complete answer and this step can be skipped.

## 6. Verify

After the env vars are set on the new host:

1. Sign in and submit a **content report with a screenshot** — the fullest path, since it
   exercises the server-side buffer upload and the public URL construction. Confirm the
   image renders in the email that arrives.
2. Confirm the object appears under `public/reports/` in the bucket.
3. Exercise `POST /api/upload/presigned` (signed in) and PUT to the returned URL. The
   client must send a `Content-Type` header matching the one used to sign, or R2 returns
   `403 SignatureDoesNotMatch`.

## Code touchpoints

- `lib/aws-config.ts` — client construction (`region: 'auto'`, account endpoint, explicit
  credentials), bucket config, public base URL.
- `lib/s3.ts` — `generatePresignedUploadUrl`, `getFileUrl`, `uploadPublicBuffer`,
  `deleteFile`, plus the internal `publicUrlFor` helper.
- Consumers: `app/api/upload/presigned/route.ts`, `app/api/report/route.ts`.

Both filenames are deliberately unchanged despite no longer being AWS-specific: a rebrand
export from Abacus is still pending a diff into this repo, and renaming files now would
widen that diff for no functional gain. Rename once the export has landed.
