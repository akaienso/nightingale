// Object-storage client — Cloudflare R2, via its S3-compatible API.
//
// The app previously used an Abacus-provisioned S3 bucket. That bucket was
// never Rob's (no AWS account exists) and dies with the Abacus account, so
// storage moved to R2 in the personal RMoore.dev Cloudflare account.
//
// R2 speaks the S3 API, so @aws-sdk/client-s3 is retained and no dependency
// changed. What differs from AWS:
//   - `region` must be the literal "auto" (required by the SDK, ignored by R2)
//   - `endpoint` is the account-scoped R2 host
//   - credentials are explicit; there is no instance role to fall back on
//
// The filename is kept as aws-config.ts on purpose: a rebrand export from
// Abacus is still pending a diff into this repo, and renaming files now would
// widen that diff for no functional gain.

import { S3Client } from '@aws-sdk/client-s3';

/** Cloudflare account that owns the bucket. Falls back to the shared account id. */
function accountId(): string {
  return process.env.R2_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || '';
}

export function getBucketConfig() {
  return {
    bucketName: process.env.R2_BUCKET_NAME ?? '',
    folderPrefix: process.env.R2_FOLDER_PREFIX ?? '',
  };
}

/**
 * Public base URL for objects served without a signature.
 *
 * Set this to the bucket's public r2.dev URL or, better, a custom domain bound
 * to the bucket. Note this is NOT interchangeable with the S3 endpoint:
 * presigned URLs only work on the S3 API domain, never on a custom domain.
 */
export function getPublicBaseUrl(): string {
  return (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
}

export function createS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
}
