import 'server-only';

/**
 * S3 object storage — the single place the app talks to the uploads bucket.
 *
 * The bucket (infra/storage.tf) is PRIVATE (public access fully blocked); files are served to
 * the browser via short-lived presigned GET URLs, and written with PutObject. Credentials come
 * from the standard AWS chain (AWS_ACCESS_KEY_ID / role / profile), the same as email.ts.
 *
 * ── Key layout (well-partitioned, tenant-first) ──────────────────────────────────────────────
 *   care-circles/{circleId}/{category}/{yyyy}/{mm}/{objectId}.{ext}
 *
 * Why this shape:
 *  - Tenant-first (`care-circles/{circleId}/…`) mirrors the per-circle RLS boundary: every object
 *    belongs to exactly one circle, so listing, lifecycle rules, and "delete a whole circle" are
 *    a single prefix operation, and an accidental cross-tenant read is obvious in the key itself.
 *  - `{category}` (recipient-photos / documents / timeline / avatars) keeps unrelated assets in
 *    separate prefixes so policies and lifecycle can differ per kind.
 *  - `{yyyy}/{mm}` date sharding avoids a single hot prefix once a busy circle accumulates many
 *    documents/timeline photos (S3 scales per-prefix). Low-volume categories can omit it.
 *  - `{objectId}` is a random UUID so keys are unguessable and never collide; the real filename
 *    is metadata, never the key.
 */
import { randomUUID } from 'node:crypto';
import { serverLog } from '@/lib/log';

export type StorageCategory =
  | 'recipient-photos'
  | 'documents'
  | 'timeline'
  | 'avatars'
  | 'incidents'
  // Medications "collection": images (pill photos / extra photos) and documents (leaflets, scans).
  // Nested so the bucket has care-circles/{id}/medications/images/… and …/medications/documents/….
  | 'medications/images'
  | 'medications/documents';

/** Map of supported image mime types → file extension used in the object key. */
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
};

/** Common document/file mime types → extension, used when a filename has no usable extension. */
const FILE_EXT: Record<string, string> = {
  ...IMAGE_EXT,
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

const BUCKET = process.env.S3_BUCKET;

/** True when the SDK has a region + credentials and a target bucket to write to. */
export function isS3Configured(): boolean {
  return (
    Boolean(BUCKET) &&
    Boolean(process.env.AWS_REGION) &&
    Boolean(
      process.env.AWS_ACCESS_KEY_ID ||
        process.env.AWS_ROLE_ARN ||
        process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
        process.env.AWS_PROFILE,
    )
  );
}

let _s3: import('@aws-sdk/client-s3').S3Client | null = null;
async function s3Client() {
  if (!_s3) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { awsCredentials } = await import('@/lib/aws/credentials');
    _s3 = new S3Client({ region: process.env.AWS_REGION, credentials: await awsCredentials() });
  }
  return _s3;
}

/** Two-digit zero-padded string (for the month partition). */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Build a partitioned object key. `datePartition` (default true) inserts `{yyyy}/{mm}` — leave it
 * on for high-volume categories (documents, timeline); a caller may pass false for singletons.
 */
export function buildObjectKey(opts: {
  circleId: string;
  category: StorageCategory;
  ext: string;
  datePartition?: boolean;
}): string {
  const { circleId, category, ext } = opts;
  const datePartition = opts.datePartition ?? true;
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const parts = ['care-circles', circleId, category];
  if (datePartition) {
    const now = new Date();
    parts.push(String(now.getUTCFullYear()), pad2(now.getUTCMonth() + 1));
  }
  parts.push(`${randomUUID()}.${safeExt}`);
  return parts.join('/');
}

/**
 * Decode a `data:` URL into bytes + mime. Returns null if it isn't a base64 image data URL.
 */
export function parseImageDataUrl(dataUrl: string): { mime: string; ext: string; body: Buffer } | null {
  const match = /^data:([a-z0-9.+/-]+);base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = IMAGE_EXT[mime];
  if (!ext) return null; // not an image type we accept
  try {
    const body = Buffer.from(match[2], 'base64');
    if (body.length === 0) return null;
    return { mime, ext, body };
  } catch {
    return null;
  }
}

/** Upload raw bytes to the bucket. Returns the stored key. Throws if S3 isn't configured. */
export async function putObject(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  if (!BUCKET) throw new Error('S3_BUCKET is not configured');
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await s3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
      // Defense in depth: server-side encryption at rest even though the bucket may default it.
      ServerSideEncryption: 'AES256',
    }),
  );
  return opts.key;
}

/**
 * Upload an image supplied as a `data:` URL to a partitioned key and return that key.
 * Returns null (never throws) when the input isn't a valid image or S3 isn't configured — the
 * caller treats a missing photo as "no photo", never as a hard failure.
 */
export async function uploadImageDataUrl(opts: {
  circleId: string;
  category: StorageCategory;
  dataUrl: string;
  datePartition?: boolean;
  maxBytes?: number;
}): Promise<string | null> {
  if (!isS3Configured()) {
    serverLog('storage', 'uploadImage', 'failure', { category: opts.category, reason: 'not_configured' });
    return null;
  }
  const parsed = parseImageDataUrl(opts.dataUrl);
  if (!parsed) {
    serverLog('storage', 'uploadImage', 'failure', { category: opts.category, reason: 'not_an_image' });
    return null;
  }
  const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024; // 5 MB hard ceiling
  if (parsed.body.length > maxBytes) {
    serverLog('storage', 'uploadImage', 'failure', { category: opts.category, reason: 'too_large', bytes: parsed.body.length });
    return null;
  }
  try {
    const key = buildObjectKey({
      circleId: opts.circleId,
      category: opts.category,
      ext: parsed.ext,
      datePartition: opts.datePartition,
    });
    await putObject({ key, body: parsed.body, contentType: parsed.mime });
    serverLog('storage', 'uploadImage', 'success', { category: opts.category, bytes: parsed.body.length });
    return key;
  } catch (err) {
    serverLog('storage', 'uploadImage', 'failure', {
      category: opts.category,
      reason: (err as { name?: string })?.name ?? 'error',
    });
    return null;
  }
}

/** Best-effort extension for an uploaded file: prefer its filename, fall back to its mime type. */
function extFromFile(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()! : '';
  const safe = fromName.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (safe && safe.length <= 5) return safe;
  return FILE_EXT[file.type?.toLowerCase() ?? ''] ?? 'bin';
}

/**
 * Upload a browser `File` (from a FormData submission) to a partitioned key. Used for medication
 * attachments — images AND documents. Returns the stored key + metadata, or null (never throws)
 * if S3 isn't configured or the file is empty / too large, so a failed attachment never blocks
 * saving the medication itself.
 */
export async function uploadFile(opts: {
  circleId: string;
  category: StorageCategory;
  file: File;
  maxBytes?: number;
}): Promise<{ key: string; contentType: string; fileName: string; size: number } | null> {
  if (!isS3Configured()) {
    serverLog('storage', 'uploadFile', 'failure', { category: opts.category, reason: 'not_configured' });
    return null;
  }
  const maxBytes = opts.maxBytes ?? 15 * 1024 * 1024; // 15 MB ceiling for documents/images
  if (opts.file.size === 0 || opts.file.size > maxBytes) {
    serverLog('storage', 'uploadFile', 'failure', { category: opts.category, reason: 'bad_size', bytes: opts.file.size });
    return null;
  }
  try {
    const body = Buffer.from(await opts.file.arrayBuffer());
    if (body.length === 0) return null;
    const ext = extFromFile(opts.file);
    const contentType = opts.file.type || 'application/octet-stream';
    const key = buildObjectKey({ circleId: opts.circleId, category: opts.category, ext, datePartition: true });
    await putObject({ key, body, contentType });
    serverLog('storage', 'uploadFile', 'success', { category: opts.category, bytes: body.length });
    return { key, contentType, fileName: opts.file.name.slice(0, 200), size: body.length };
  } catch (err) {
    serverLog('storage', 'uploadFile', 'failure', {
      category: opts.category,
      reason: (err as { name?: string })?.name ?? 'error',
    });
    return null;
  }
}

/**
 * Download an object's raw bytes by key — used by the RAG ingest worker to extract text for
 * embedding. Returns null (never throws) when S3 isn't configured or the fetch fails, so ingestion
 * can skip an unreadable file without crashing.
 */
export async function getObjectBytes(key: string): Promise<Buffer | null> {
  if (!BUCKET || !isS3Configured()) return null;
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3Client();
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (err) {
    serverLog('storage', 'getObjectBytes', 'failure', { reason: (err as { name?: string })?.name ?? 'error' });
    return null;
  }
}

/** Delete an object by key. Best-effort: logs and swallows errors. */
export async function deleteObject(key: string): Promise<void> {
  if (!BUCKET || !isS3Configured()) return;
  try {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3Client();
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    serverLog('storage', 'deleteObject', 'failure', { reason: (err as { name?: string })?.name ?? 'error' });
  }
}

/**
 * Delete every object under a circle's `care-circles/{id}/` prefix — the storage half of deleting
 * a circle (the DB rows cascade; the files do not). Best-effort like the other side-effects here:
 * paginates, batch-deletes, logs success/failure, never throws into the caller.
 */
export async function deleteCirclePrefix(circleId: string): Promise<void> {
  if (!BUCKET || !isS3Configured()) return;
  try {
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    const client = await s3Client();
    const prefix = `care-circles/${circleId}/`;
    let continuationToken: string | undefined;
    let removed = 0;
    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: continuationToken }),
      );
      const objects = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
      if (objects.length) {
        await client.send(
          new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: objects, Quiet: true } }),
        );
        removed += objects.length;
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
    serverLog('storage', 'deleteCirclePrefix', 'success', { circleId, removed });
  } catch (err) {
    serverLog('storage', 'deleteCirclePrefix', 'failure', {
      circleId,
      reason: (err as { name?: string })?.name ?? 'error',
    });
  }
}

/**
 * A storage key looks like `care-circles/...`; anything else stored in an avatar/url column is an
 * already-resolvable URL (legacy data URL, or an external https URL) and is returned unchanged.
 */
export function isStorageKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('care-circles/');
}

/**
 * Resolve a stored value to something an <img src> can use: a short-lived presigned GET URL for
 * S3 keys, or the value as-is for data:/https: URLs. Returns null on absent/failed input so the
 * caller can fall back to an initials placeholder.
 */
export async function resolveStoredUrl(
  value: string | null | undefined,
  ttlSeconds = 3600,
): Promise<string | null> {
  if (!value) return null;
  if (!isStorageKey(value)) return value; // data: or https: — already usable
  if (!BUCKET || !isS3Configured()) return null;
  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = await s3Client();
    return await getSignedUrl(client, new GetObjectCommand({ Bucket: BUCKET, Key: value }), {
      expiresIn: ttlSeconds,
    });
  } catch (err) {
    serverLog('storage', 'resolveStoredUrl', 'failure', { reason: (err as { name?: string })?.name ?? 'error' });
    return null;
  }
}
