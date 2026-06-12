/**
 * S3 storage tests — the S3 SDK + presigner are fully MOCKED (no real AWS, no network).
 * Covers the pure key/data-url helpers, the fail-closed "not configured → null, never throw"
 * contract of every upload/download helper, and that writes always request AES256 encryption.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
const clientCtor = vi.fn(() => ({ send: sendMock }));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: clientCtor,
  PutObjectCommand: vi.fn((input: unknown) => ({ __type: 'Put', input })),
  GetObjectCommand: vi.fn((input: unknown) => ({ __type: 'Get', input })),
  DeleteObjectCommand: vi.fn((input: unknown) => ({ __type: 'Delete', input })),
  ListObjectsV2Command: vi.fn((input: unknown) => ({ __type: 'List', input })),
  DeleteObjectsCommand: vi.fn((input: unknown) => ({ __type: 'DeleteMany', input })),
}));

const getSignedUrlMock = vi.fn();
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}));

vi.mock('@/lib/aws/credentials', () => ({ awsCredentials: vi.fn(async () => undefined) }));
vi.mock('@/lib/log', () => ({ serverLog: vi.fn() }));

const ENV_KEYS = ['S3_BUCKET', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_ROLE_ARN', 'AWS_PROFILE', 'AWS_WEB_IDENTITY_TOKEN_FILE'];
const CONFIGURED = { S3_BUCKET: 'test-bucket', AWS_REGION: 'us-east-1', AWS_ACCESS_KEY_ID: 'AKIA_TEST' };

function setEnv(env: Record<string, string>) {
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
}

/** Import a fresh copy of the module AFTER env is set (S3_BUCKET is read at module load). */
async function loadS3(env: Record<string, string>) {
  setEnv(env);
  return import('../s3');
}

// 1x1 transparent PNG, base64.
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`;

beforeEach(() => {
  vi.resetModules(); // s3.ts caches BUCKET and its client at module scope
  sendMock.mockReset();
  clientCtor.mockClear();
  getSignedUrlMock.mockReset();
});

describe('buildObjectKey', () => {
  it('builds the tenant-first, date-partitioned key layout', async () => {
    const { buildObjectKey } = await loadS3(CONFIGURED);
    const key = buildObjectKey({ circleId: 'circle-1', category: 'documents', ext: 'pdf' });
    expect(key).toMatch(
      /^care-circles\/circle-1\/documents\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/,
    );
  });

  it('omits the date partition when asked, and sanitizes a hostile extension', async () => {
    const { buildObjectKey } = await loadS3(CONFIGURED);
    const key = buildObjectKey({
      circleId: 'c',
      category: 'avatars',
      ext: '../P NG!', // traversal characters must never reach the key
      datePartition: false,
    });
    expect(key).toMatch(/^care-circles\/c\/avatars\/[0-9a-f-]{36}\.png$/);
  });

  it('falls back to .bin when the extension sanitizes to nothing', async () => {
    const { buildObjectKey } = await loadS3(CONFIGURED);
    expect(buildObjectKey({ circleId: 'c', category: 'avatars', ext: '..//', datePartition: false })).toMatch(
      /\.bin$/,
    );
  });

  it('never collides (random uuid per key)', async () => {
    const { buildObjectKey } = await loadS3(CONFIGURED);
    const opts = { circleId: 'c', category: 'documents' as const, ext: 'pdf' };
    expect(buildObjectKey(opts)).not.toBe(buildObjectKey(opts));
  });
});

describe('parseImageDataUrl', () => {
  it('decodes an accepted image data URL', async () => {
    const { parseImageDataUrl } = await loadS3(CONFIGURED);
    const parsed = parseImageDataUrl(PNG_DATA_URL);
    expect(parsed).not.toBeNull();
    expect(parsed!.mime).toBe('image/png');
    expect(parsed!.ext).toBe('png');
    expect(parsed!.body.equals(Buffer.from(PNG_B64, 'base64'))).toBe(true);
  });

  it.each([
    ['not a data url', 'https://example.com/x.png'],
    ['non-image mime', 'data:application/pdf;base64,aGVsbG8='],
    ['empty body', 'data:image/png;base64,'],
    ['svg (not in the allow-list — XSS vector)', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
  ])('rejects %s', async (_label, input) => {
    const { parseImageDataUrl } = await loadS3(CONFIGURED);
    expect(parseImageDataUrl(input)).toBeNull();
  });
});

describe('isStorageKey', () => {
  it('accepts only the care-circles/ prefix', async () => {
    const { isStorageKey } = await loadS3(CONFIGURED);
    expect(isStorageKey('care-circles/c1/avatars/x.png')).toBe(true);
    expect(isStorageKey('https://example.com/a.png')).toBe(false);
    expect(isStorageKey('data:image/png;base64,AAAA')).toBe(false);
    expect(isStorageKey(null)).toBe(false);
    expect(isStorageKey(undefined)).toBe(false);
  });
});

describe('uploadImageDataUrl', () => {
  it('returns null without touching AWS when S3 is not configured (fail-closed, never throws)', async () => {
    const { uploadImageDataUrl } = await loadS3({});
    const key = await uploadImageDataUrl({ circleId: 'c', category: 'avatars', dataUrl: PNG_DATA_URL });
    expect(key).toBeNull();
    expect(clientCtor).not.toHaveBeenCalled();
  });

  it('returns null for a non-image payload', async () => {
    const { uploadImageDataUrl } = await loadS3(CONFIGURED);
    expect(
      await uploadImageDataUrl({ circleId: 'c', category: 'avatars', dataUrl: 'data:text/html;base64,PGI+' }),
    ).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('enforces the size ceiling without uploading', async () => {
    const { uploadImageDataUrl } = await loadS3(CONFIGURED);
    expect(
      await uploadImageDataUrl({ circleId: 'c', category: 'avatars', dataUrl: PNG_DATA_URL, maxBytes: 10 }),
    ).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('uploads via the MOCKED PutObject with AES256 encryption and returns the key', async () => {
    sendMock.mockResolvedValue({});
    const { uploadImageDataUrl } = await loadS3(CONFIGURED);
    const key = await uploadImageDataUrl({ circleId: 'circle-9', category: 'avatars', dataUrl: PNG_DATA_URL });

    expect(key).toMatch(/^care-circles\/circle-9\/avatars\//);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = sendMock.mock.calls[0][0] as { __type: string; input: Record<string, unknown> };
    expect(cmd.__type).toBe('Put');
    expect(cmd.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: key,
      ContentType: 'image/png',
      ServerSideEncryption: 'AES256',
    });
  });

  it('returns null (never throws) when the S3 call fails', async () => {
    sendMock.mockRejectedValue(Object.assign(new Error('boom'), { name: 'AccessDenied' }));
    const { uploadImageDataUrl } = await loadS3(CONFIGURED);
    await expect(
      uploadImageDataUrl({ circleId: 'c', category: 'avatars', dataUrl: PNG_DATA_URL }),
    ).resolves.toBeNull();
  });
});

describe('uploadFile', () => {
  it('rejects empty and oversized files without uploading', async () => {
    const { uploadFile } = await loadS3(CONFIGURED);
    const empty = new File([], 'empty.pdf', { type: 'application/pdf' });
    expect(await uploadFile({ circleId: 'c', category: 'medications/documents', file: empty })).toBeNull();

    const big = new File([new Uint8Array(64)], 'big.pdf', { type: 'application/pdf' });
    expect(
      await uploadFile({ circleId: 'c', category: 'medications/documents', file: big, maxBytes: 10 }),
    ).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('uploads a file and reports key + metadata; extension comes from the filename', async () => {
    sendMock.mockResolvedValue({});
    const { uploadFile } = await loadS3(CONFIGURED);
    const file = new File([Buffer.from('hello pdf')], 'care-plan.PDF', { type: 'application/pdf' });

    const res = await uploadFile({ circleId: 'c1', category: 'medications/documents', file });

    expect(res).toMatchObject({ contentType: 'application/pdf', fileName: 'care-plan.PDF', size: 9 });
    expect(res!.key).toMatch(/^care-circles\/c1\/medications\/documents\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/);
    const cmd = sendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(cmd.input.ServerSideEncryption).toBe('AES256');
  });

  it('falls back to the mime-derived extension when the filename has none', async () => {
    sendMock.mockResolvedValue({});
    const { uploadFile } = await loadS3(CONFIGURED);
    const file = new File([Buffer.from('x')], 'scan', { type: 'image/jpeg' });
    const res = await uploadFile({ circleId: 'c', category: 'medications/images', file });
    expect(res!.key).toMatch(/\.jpg$/);
  });
});

describe('getObjectBytes', () => {
  it('returns the object bytes through the mocked GetObject', async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
    });
    const { getObjectBytes } = await loadS3(CONFIGURED);
    const buf = await getObjectBytes('care-circles/c/documents/x.pdf');
    expect(buf!.equals(Buffer.from([1, 2, 3]))).toBe(true);
    const cmd = sendMock.mock.calls[0][0] as { __type: string; input: Record<string, unknown> };
    expect(cmd.__type).toBe('Get');
    expect(cmd.input).toEqual({ Bucket: 'test-bucket', Key: 'care-circles/c/documents/x.pdf' });
  });

  it('returns null when unconfigured or on SDK failure (ingest skips, never crashes)', async () => {
    const offline = await loadS3({});
    expect(await offline.getObjectBytes('care-circles/c/x.pdf')).toBeNull();

    vi.resetModules();
    sendMock.mockRejectedValue(new Error('nope'));
    const online = await loadS3(CONFIGURED);
    expect(await online.getObjectBytes('care-circles/c/x.pdf')).toBeNull();
  });
});

describe('deleteCirclePrefix', () => {
  it('paginates the listing and batch-deletes every object under the circle prefix', async () => {
    sendMock.mockImplementation(async (cmd: { __type: string; input: { ContinuationToken?: string } }) => {
      if (cmd.__type === 'List') {
        return cmd.input.ContinuationToken
          ? { Contents: [{ Key: 'care-circles/c1/b' }], IsTruncated: false }
          : { Contents: [{ Key: 'care-circles/c1/a' }], IsTruncated: true, NextContinuationToken: 'page2' };
      }
      return {};
    });

    const { deleteCirclePrefix } = await loadS3(CONFIGURED);
    await deleteCirclePrefix('c1');

    const calls = sendMock.mock.calls.map((c) => c[0] as { __type: string; input: Record<string, unknown> });
    expect(calls.filter((c) => c.__type === 'List')).toHaveLength(2);
    const deletes = calls.filter((c) => c.__type === 'DeleteMany');
    expect(deletes).toHaveLength(2);
    expect(deletes[0].input).toMatchObject({
      Bucket: 'test-bucket',
      Delete: { Objects: [{ Key: 'care-circles/c1/a' }], Quiet: true },
    });
    expect((calls[0].input as { Prefix: string }).Prefix).toBe('care-circles/c1/');
  });

  it('is best-effort: an SDK failure is swallowed, never thrown', async () => {
    sendMock.mockRejectedValue(new Error('listing failed'));
    const { deleteCirclePrefix } = await loadS3(CONFIGURED);
    await expect(deleteCirclePrefix('c1')).resolves.toBeUndefined();
  });
});

describe('resolveStoredUrl', () => {
  it('passes through values that are already usable URLs, without AWS', async () => {
    const { resolveStoredUrl } = await loadS3(CONFIGURED);
    expect(await resolveStoredUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(await resolveStoredUrl(PNG_DATA_URL)).toBe(PNG_DATA_URL);
    expect(await resolveStoredUrl(null)).toBeNull();
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it('presigns storage keys via the MOCKED presigner with the requested TTL', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.example/url');
    const { resolveStoredUrl } = await loadS3(CONFIGURED);

    const url = await resolveStoredUrl('care-circles/c/avatars/x.png', 900);

    expect(url).toBe('https://signed.example/url');
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    const [, cmd, opts] = getSignedUrlMock.mock.calls[0] as [unknown, { input: Record<string, unknown> }, { expiresIn: number }];
    expect(cmd.input).toEqual({ Bucket: 'test-bucket', Key: 'care-circles/c/avatars/x.png' });
    expect(opts.expiresIn).toBe(900);
  });

  it('returns null for a storage key when S3 is not configured (placeholder fallback)', async () => {
    const { resolveStoredUrl } = await loadS3({});
    expect(await resolveStoredUrl('care-circles/c/avatars/x.png')).toBeNull();
  });
});
