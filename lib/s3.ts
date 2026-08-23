import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig, getPublicBaseUrl } from './aws-config';

/**
 * Public URL for an object in the public prefix.
 *
 * R2 serves these from the bucket's public hostname (r2.dev or a bound custom
 * domain), NOT from the S3 API endpoint — so it comes from its own env var.
 */
function publicUrlFor(cloud_storage_path: string): string {
  const base = getPublicBaseUrl();
  const encodedKey = cloud_storage_path.split('/').map(encodeURIComponent).join('/');
  return `${base}/${encodedKey}`;
}

function shouldServeInline(contentType: string): boolean {
  return (
    (contentType.startsWith('image/') && contentType !== 'image/svg+xml') ||
    contentType.startsWith('video/') ||
    contentType.startsWith('audio/')
  );
}

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic = false
) {
  const s3 = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  const prefix = isPublic ? `${folderPrefix}public/uploads` : `${folderPrefix}uploads`;
  const cloud_storage_path = `${prefix}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return { uploadUrl, cloud_storage_path };
}

export async function getFileUrl(
  cloud_storage_path: string,
  contentType: string,
  isPublic: boolean
) {
  const { bucketName } = getBucketConfig();
  if (isPublic) {
    return publicUrlFor(cloud_storage_path);
  }
  const s3 = createS3Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: shouldServeInline(contentType) ? 'inline' : 'attachment',
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

/**
 * Server-side upload of a raw buffer to public storage. Used for flows where the
 * client can't use a presigned URL (e.g. anonymous users submitting a report
 * screenshot). Returns the public URL of the stored object.
 */
export async function uploadPublicBuffer(
  buffer: Buffer,
  contentType: string,
  fileName: string
) {
  const s3 = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();
  const cloud_storage_path = `${folderPrefix}public/reports/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return { cloud_storage_path, url: publicUrlFor(cloud_storage_path) };
}

export async function deleteFile(cloud_storage_path: string) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path }));
}
