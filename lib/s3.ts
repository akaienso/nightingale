import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

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
    const region = process.env.AWS_REGION || 'us-east-1';
    const encodedKey = cloud_storage_path
      .split('/')
      .map(encodeURIComponent)
      .join('/');
    return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`;
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

  const region = process.env.AWS_REGION || 'us-east-1';
  const encodedKey = cloud_storage_path.split('/').map(encodeURIComponent).join('/');
  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`;
  return { cloud_storage_path, url };
}

export async function deleteFile(cloud_storage_path: string) {
  const s3 = createS3Client();
  const { bucketName } = getBucketConfig();
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cloud_storage_path }));
}
