/**
 * Invitation accept/decline action tests — auth, DB, email and logging are all MOCKED (no AWS,
 * no DB, no network). The contracts under test are security ones:
 *   - the RAW link token never reaches the database; only its SHA-256 does (drizzle/0045);
 *   - accept requires a session, decline deliberately does not (token possession = authz);
 *   - a signed-in decline runs in the user's RLS context so the audit row is attributed;
 *   - invalid/expired tokens produce friendly errors, never stack traces or token echoes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

const auth = vi.fn();
vi.mock('@/auth', () => ({ auth: () => auth() }));

const dbExecute = vi.fn();
vi.mock('@/db', () => ({ db: { execute: (q: unknown) => dbExecute(q) } }));

const requireSession = vi.fn();
const withAuthedDb = vi.fn();
vi.mock('@/db/dal', () => ({
  requireSession: () => requireSession(),
  withAuthedDb: (fn: unknown) => withAuthedDb(fn),
}));

const recordAuditEvent = vi.fn();
vi.mock('@/db/audit', () => ({ recordAuditEvent: (...a: unknown[]) => recordAuditEvent(...a) }));

vi.mock('@/lib/email', () => ({ sendJoinedCircleEmail: vi.fn() }));
vi.mock('@/lib/url', () => ({ getAppOrigin: vi.fn(async () => 'https://app.test') }));
vi.mock('@/lib/log', () => ({ serverLog: vi.fn() }));
// Cross-cutting cache hint — a best-effort side-effect with no request scope in unit tests.
vi.mock('@/lib/revalidate', () => ({ revalidateCareViews: vi.fn() }));

import { acceptInvitation, declineInvitation } from '../actions';

const RAW_TOKEN = 'raw-invite-token-from-the-emailed-link';
const TOKEN_SHA256 = createHash('sha256').update(RAW_TOKEN).digest('hex');

/** Collect every string buried in a drizzle SQL object (chunks + bound params), cycle-safe. */
function collectStrings(value: unknown, out: string[] = [], seen = new Set<object>()): string[] {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') {
    if (seen.has(value as object)) return out;
    seen.add(value as object);
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out, seen);
  }
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('declineInvitation', () => {
  it('rejects a malformed token without touching the database', async () => {
    auth.mockResolvedValue(null);
    expect(await declineInvitation('')).toEqual({ ok: false, error: expect.stringMatching(/invalid/i) });
    expect(await declineInvitation('x'.repeat(600))).toEqual({
      ok: false,
      error: expect.stringMatching(/invalid/i),
    });
    expect(dbExecute).not.toHaveBeenCalled();
    expect(withAuthedDb).not.toHaveBeenCalled();
  });

  it('works WITHOUT a session (capability link) and sends only the token HASH to the DB', async () => {
    auth.mockResolvedValue(null);
    dbExecute.mockResolvedValue([{ circle_id: 'c1', invitation_id: 'i1' }]);

    const result = await declineInvitation(RAW_TOKEN);

    expect(result).toEqual({ ok: true });
    expect(dbExecute).toHaveBeenCalledTimes(1);
    expect(withAuthedDb).not.toHaveBeenCalled(); // anonymous → raw client, no RLS context to set

    const strings = collectStrings(dbExecute.mock.calls[0][0]);
    expect(strings.some((s) => s.includes(TOKEN_SHA256))).toBe(true); // hash reaches the DB…
    expect(strings.some((s) => s.includes(RAW_TOKEN))).toBe(false); // …the raw secret never does
  });

  it('runs in the user RLS context when signed in, so the audit row is attributed', async () => {
    auth.mockResolvedValue({ user: { id: 'user-1' } });
    const txExecute = vi.fn().mockResolvedValue([{ circle_id: 'c1', invitation_id: 'i1' }]);
    withAuthedDb.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ execute: txExecute }),
    );

    const result = await declineInvitation(RAW_TOKEN);

    expect(result).toEqual({ ok: true });
    expect(withAuthedDb).toHaveBeenCalledTimes(1);
    expect(dbExecute).not.toHaveBeenCalled();
    const strings = collectStrings(txExecute.mock.calls[0][0]);
    expect(strings.some((s) => s.includes(TOKEN_SHA256))).toBe(true);
    expect(strings.some((s) => s.includes(RAW_TOKEN))).toBe(false);
  });

  it('maps an expired/used/revoked invitation to a friendly message (fail-closed, single-use)', async () => {
    auth.mockResolvedValue(null);
    dbExecute.mockRejectedValue(new Error('decline_invitation: invitation not valid'));
    const result = await declineInvitation(RAW_TOKEN);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/no longer valid/i) });
  });

  it('maps an unknown token to the same friendly message (no oracle for token existence)', async () => {
    auth.mockResolvedValue(null);
    dbExecute.mockRejectedValue(new Error('decline_invitation: invitation not found'));
    const result = await declineInvitation(RAW_TOKEN);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/no longer valid/i) });
  });

  it('returns a generic error (never the DB error or the token) on an unexpected failure', async () => {
    auth.mockResolvedValue(null);
    dbExecute.mockRejectedValue(Object.assign(new Error('connection refused 10.0.1.7:5432'), { name: 'PostgresError' }));
    const result = (await declineInvitation(RAW_TOKEN)) as { ok: false; error: string };
    expect(result.ok).toBe(false);
    expect(result.error).not.toMatch(/10\.0\.1\.7|connection|postgres/i);
    expect(result.error).not.toContain(RAW_TOKEN);
  });
});

describe('acceptInvitation', () => {
  it('sends only the token HASH to accept_invitation — the raw link secret never hits the DB', async () => {
    requireSession.mockResolvedValue({ id: 'user-1', name: 'Ana', email: 'ana@example.com' });
    const txExecute = vi.fn().mockResolvedValue([
      // already_member=true keeps the test on the accept path (no timeline/welcome branches).
      { circle_id: 'c1', membership_id: 'm1', role: 'family', already_member: true },
    ]);
    withAuthedDb.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ execute: txExecute }),
    );

    const result = await acceptInvitation(RAW_TOKEN);

    expect(result).toEqual({ ok: true, circleId: 'c1', alreadyMember: true });
    const strings = collectStrings(txExecute.mock.calls[0][0]);
    expect(strings.some((s) => s.includes(TOKEN_SHA256))).toBe(true);
    expect(strings.some((s) => s.includes(RAW_TOKEN))).toBe(false);
    // The join is audited in the SAME transaction.
    expect(recordAuditEvent).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ circleId: 'c1', action: 'invite', entityType: 'membership' }),
      expect.anything(),
    );
  });
});
