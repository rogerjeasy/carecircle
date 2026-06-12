/**
 * Integration test for POST /api/ingest — the real route handler runs end-to-end, but auth, the
 * admin DB, the RAG config and the backfill worker are all MOCKED: no AWS, no DB, no network.
 * The contract under test is the 🔒 platform-admin gate (valid session AND allowlist), input
 * validation, and that every privileged run goes through `logPlatformAccess`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.fn();
vi.mock('@/auth', () => ({ auth: () => auth() }));

const isPlatformAdminEmail = vi.fn();
vi.mock('@/lib/admin/access', () => ({
  isPlatformAdminEmail: (e: unknown) => isPlatformAdminEmail(e),
}));

const isPlatformDbConfigured = vi.fn();
const getPlatformDb = vi.fn();
const logPlatformAccess = vi.fn();
vi.mock('@/db/admin-db', () => ({
  isPlatformDbConfigured: () => isPlatformDbConfigured(),
  getPlatformDb: () => getPlatformDb(),
  logPlatformAccess: (...a: unknown[]) => logPlatformAccess(...a),
}));

const isRagConfigured = vi.fn();
vi.mock('@/lib/rag/config', () => ({ isRagConfigured: () => isRagConfigured() }));

const backfillCircle = vi.fn();
vi.mock('@/lib/rag/ingest', () => ({
  backfillCircle: (...a: unknown[]) => backfillCircle(...a),
}));

vi.mock('@/lib/log', () => ({ serverLog: vi.fn(), maskEmail: vi.fn(() => '***@masked') }));

import { POST } from '../route';

const ADMIN_SESSION = { user: { id: 'admin-1', email: 'admin@kintwadi.example' } };
const CIRCLE_ID = '6f9619ff-8b86-4d01-b42d-00cf4fc964ff';

function post(body: unknown): Request {
  return new Request('http://localhost/api/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Fake drizzle handle: `db.select(...).from(...)` resolves to all circle ids. */
function fakeDb(circleIds: string[]) {
  return { select: () => ({ from: async () => circleIds.map((id) => ({ id })) }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue(ADMIN_SESSION);
  isPlatformAdminEmail.mockReturnValue(true);
  isRagConfigured.mockReturnValue(true);
  isPlatformDbConfigured.mockReturnValue(true);
  getPlatformDb.mockReturnValue(fakeDb([CIRCLE_ID]));
  backfillCircle.mockResolvedValue({ documents: 2, timeline: 3, audit: 1, vectors: 12 });
});

describe('the platform-admin gate (fail-closed)', () => {
  it('403s an unauthenticated request', async () => {
    auth.mockResolvedValue(null);
    const res = await POST(post({}));
    expect(res.status).toBe(403);
    expect(backfillCircle).not.toHaveBeenCalled();
  });

  it('403s a signed-in user who is NOT on the platform-admin allowlist', async () => {
    isPlatformAdminEmail.mockReturnValue(false);
    const res = await POST(post({}));
    expect(res.status).toBe(403);
    expect(isPlatformAdminEmail).toHaveBeenCalledWith(ADMIN_SESSION.user.email);
    expect(backfillCircle).not.toHaveBeenCalled();
  });

  it('403s a session with no user id even if the email matches (both checks required)', async () => {
    auth.mockResolvedValue({ user: { email: 'admin@kintwadi.example' } });
    expect((await POST(post({}))).status).toBe(403);
  });
});

describe('readiness + validation', () => {
  it('503s when RAG (Bedrock embeddings) is not configured', async () => {
    isRagConfigured.mockReturnValue(false);
    expect((await POST(post({}))).status).toBe(503);
    expect(backfillCircle).not.toHaveBeenCalled();
  });

  it('503s when the admin DB connection is not configured', async () => {
    isPlatformDbConfigured.mockReturnValue(false);
    expect((await POST(post({}))).status).toBe(503);
  });

  it('400s a non-uuid circleId', async () => {
    const res = await POST(post({ circleId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
    expect(backfillCircle).not.toHaveBeenCalled();
  });

  it('treats an unparseable body as an empty one (backfill-all), not a crash', async () => {
    const res = await POST(
      new Request('http://localhost/api/ingest', { method: 'POST', body: 'not json' }),
    );
    expect(res.status).toBe(200);
  });
});

describe('the backfill', () => {
  it('reindexes ONE circle when circleId is given, and records the privileged access', async () => {
    const res = await POST(post({ circleId: CIRCLE_ID }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      circles: 1,
      documents: 2,
      timeline: 3,
      audit: 1,
      vectors: 12,
    });
    expect(backfillCircle).toHaveBeenCalledTimes(1);
    expect(backfillCircle.mock.calls[0][1]).toBe(CIRCLE_ID);
    // Cross-tenant access MUST be audited (AGENTS.md → platform super-admin).
    expect(logPlatformAccess).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@kintwadi.example' },
      'rag-backfill',
      { circles: 1 },
    );
  });

  it('backfills EVERY circle and sums the totals when circleId is omitted', async () => {
    getPlatformDb.mockReturnValue(fakeDb(['circle-a', 'circle-b']));
    backfillCircle
      .mockResolvedValueOnce({ documents: 1, timeline: 0, audit: 0, vectors: 4 })
      .mockResolvedValueOnce({ documents: 2, timeline: 5, audit: 1, vectors: 9 });

    const res = await POST(post({}));

    expect(await res.json()).toEqual({
      ok: true,
      circles: 2,
      documents: 3,
      timeline: 5,
      audit: 1,
      vectors: 13,
    });
    expect(backfillCircle.mock.calls.map((c) => c[1])).toEqual(['circle-a', 'circle-b']);
  });

  it('a backfill crash returns a sanitized 500', async () => {
    backfillCircle.mockRejectedValue(Object.assign(new Error('ThrottlingException: rate exceeded'), { name: 'ThrottlingException' }));
    const res = await POST(post({ circleId: CIRCLE_ID }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'Ingest failed.' });
    expect(JSON.stringify(body)).not.toContain('Throttling');
  });
});
