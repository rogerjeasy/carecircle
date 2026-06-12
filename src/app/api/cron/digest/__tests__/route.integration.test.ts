/**
 * Integration test for GET/POST /api/cron/digest — the real route handler runs end-to-end, but
 * every dependency (platform DB, Bedrock, the digest job, logging) is MOCKED: no AWS, no DB,
 * no network. The contract under test is the 🔒 fail-closed bearer gate + readiness checks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const isPlatformDbConfigured = vi.fn();
vi.mock('@/db/admin-db', () => ({ isPlatformDbConfigured: () => isPlatformDbConfigured() }));

const isBedrockConfigured = vi.fn();
vi.mock('@/lib/ask/bedrock', () => ({ isBedrockConfigured: () => isBedrockConfigured() }));

const runDigestCron = vi.fn();
vi.mock('@/lib/digest/cron', () => ({ runDigestCron: (...a: unknown[]) => runDigestCron(...a) }));

vi.mock('@/lib/log', () => ({ serverLog: vi.fn() }));

import { GET, POST } from '../route';

const URL_ = 'http://localhost/api/cron/digest';

function request(opts: { token?: string; method?: string; url?: string } = {}): Request {
  return new Request(opts.url ?? URL_, {
    method: opts.method ?? 'GET',
    headers: opts.token !== undefined ? { authorization: `Bearer ${opts.token}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-cron-secret';
  isPlatformDbConfigured.mockReturnValue(true);
  isBedrockConfigured.mockReturnValue(true);
  runDigestCron.mockResolvedValue({ sent: 2, skipped: 1 });
});

describe('authorization (fail-closed)', () => {
  it('rejects EVERY request when CRON_SECRET is unset — even a guessed bearer', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request({ token: 'anything' }));
    expect(res.status).toBe(401);
    expect(runDigestCron).not.toHaveBeenCalled();
  });

  it('rejects a missing or wrong bearer token', async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request({ token: 'wrong-secret' }))).status).toBe(401);
    // A wrong-LENGTH token must fail too, not throw (timingSafeEqual length guard).
    expect((await GET(request({ token: 'x' }))).status).toBe(401);
    expect(runDigestCron).not.toHaveBeenCalled();
  });

  it('never leaks whether the secret exists in the response body', async () => {
    delete process.env.CRON_SECRET;
    const body = await (await GET(request({ token: 'x' }))).json();
    expect(JSON.stringify(body)).not.toMatch(/secret|configured/i);
  });
});

describe('readiness checks', () => {
  it('returns 503 when the cross-tenant DB connection is not configured', async () => {
    isPlatformDbConfigured.mockReturnValue(false);
    const res = await GET(request({ token: 'test-cron-secret' }));
    expect(res.status).toBe(503);
    expect(runDigestCron).not.toHaveBeenCalled();
  });

  it('returns 503 when Bedrock is not configured', async () => {
    isBedrockConfigured.mockReturnValue(false);
    const res = await GET(request({ token: 'test-cron-secret' }));
    expect(res.status).toBe(503);
    expect(runDigestCron).not.toHaveBeenCalled();
  });
});

describe('the job', () => {
  it('GET runs the hour-gated pass (force=false) and returns the run summary', async () => {
    const res = await GET(request({ token: 'test-cron-secret' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sent: 2, skipped: 1 });
    expect(runDigestCron).toHaveBeenCalledWith({ force: false });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('POST ?force=1 bypasses the hour guard; plain POST does not', async () => {
    await POST(request({ method: 'POST', url: `${URL_}?force=1`, token: 'test-cron-secret' }));
    expect(runDigestCron).toHaveBeenLastCalledWith({ force: true });

    await POST(request({ method: 'POST', token: 'test-cron-secret' }));
    expect(runDigestCron).toHaveBeenLastCalledWith({ force: false });
  });

  it('a job crash returns a sanitized 500 (no error details leak)', async () => {
    runDigestCron.mockRejectedValue(Object.assign(new Error('pg: relation x does not exist'), { name: 'PostgresError' }));
    const res = await GET(request({ token: 'test-cron-secret' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'Digest cron failed.' });
    expect(JSON.stringify(body)).not.toContain('relation');
  });
});
