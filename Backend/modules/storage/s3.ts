import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type LogicalBucket = "documents" | "is_code_documents";

type BucketConfig = {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function envFirst(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function requireEnv(...names: string[]): string {
  const value = envFirst(...names);
  if (!value) throw new Error(`${names.join(" or ")} is not configured.`);
  return value;
}

function resolveBucketConfig(logicalName: string): BucketConfig {
  if (logicalName === "documents") {
    return {
      bucket: requireEnv("S3_DOCUMENTS_BUCKET", "DOCUMENTS_S3_BUCKET"),
      accessKeyId: requireEnv(
        "S3_DOCUMENTS_ACCESS_KEY_ID",
        "DOCUMENTS_S3_ACCESS_KEY_ID",
      ),
      secretAccessKey: requireEnv(
        "S3_DOCUMENTS_SECRET_ACCESS_KEY",
        "DOCUMENTS_S3_SECRET_ACCESS_KEY",
      ),
    };
  }
  if (logicalName === "is_code_documents") {
    return {
      bucket: requireEnv("S3_IS_CODE_BUCKET", "IS_CODE_DOCUMENTS_S3_BUCKET"),
      accessKeyId: requireEnv(
        "S3_IS_CODE_ACCESS_KEY_ID",
        "IS_CODE_DOCUMENTS_S3_ACCESS_KEY_ID",
      ),
      secretAccessKey: requireEnv(
        "S3_IS_CODE_SECRET_ACCESS_KEY",
        "IS_CODE_DOCUMENTS_S3_SECRET_ACCESS_KEY",
      ),
    };
  }
  throw new Error(`Unknown storage bucket: ${logicalName}`);
}

const clientCache = new Map<string, S3Client>();

export function getS3ClientForBucket(logicalName: string): {
  client: S3Client;
  bucket: string;
} {
  const cfg = resolveBucketConfig(logicalName);
  const cacheKey = `${logicalName}:${cfg.accessKeyId}`;
  let client = clientCache.get(cacheKey);
  if (!client) {
    const endpoint =
      envFirst("S3_ENDPOINT", "DOCUMENTS_S3_ENDPOINT", "IS_CODE_DOCUMENTS_S3_ENDPOINT") ||
      undefined;
    client = new S3Client({
      region:
        envFirst("S3_REGION", "DOCUMENTS_S3_REGION", "IS_CODE_DOCUMENTS_S3_REGION") ||
        "auto",
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    clientCache.set(cacheKey, client);
  }
  return { client, bucket: cfg.bucket };
}

export async function uploadObject(
  logicalName: string,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
): Promise<void> {
  const { client, bucket } = getS3ClientForBucket(logicalName);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function downloadObject(
  logicalName: string,
  key: string,
): Promise<Buffer> {
  const { client, bucket } = getS3ClientForBucket(logicalName);
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty object: ${logicalName}/${key}`);
  return Buffer.from(bytes);
}

export async function deleteObjects(
  logicalName: string,
  keys: string[],
): Promise<void> {
  const unique = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  const { client, bucket } = getS3ClientForBucket(logicalName);
  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: unique.map((Key) => ({ Key })),
        Quiet: true,
      },
    }),
  );
}

export async function createSignedGetUrl(
  logicalName: string,
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { client, bucket } = getS3ClientForBucket(logicalName);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

/** Prefer signed URLs; public path is not assumed on private Railway buckets. */
export async function getPublicUrl(
  logicalName: string,
  key: string,
): Promise<string> {
  return createSignedGetUrl(logicalName, key, 3600);
}
