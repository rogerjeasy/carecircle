/**
 * Nightly Daily Digest cron endpoint.
 *
 * Meant to be called once an hour by a scheduler (Vercel Cron, EventBridge, or any pinger) with an
 * `Authorization: Bearer ${CRON_SECRET}` header. Each pass generates + emails the digest for any
 * circle whose local clock has reached its `digestHour` and that hasn't been sent today — see
 * `runDigestCron()` for the per-circle logic and idempotency guard.
 *
 * 🔒 Security: this drives a privileged, cross-tenant job (no user session), so it is NOT gated by a
 * circle role or platform-admin login — it is gated by a shared secret only the scheduler knows.
 * Fail-closed: if `CRON_SECRET` is unset, or the bearer doesn't match, every request is rejected.
 * GET is the scheduler entrypoint; POST additionally accepts `?force=1` to send immediately
 * (bypassing the hour/already-sent guards) for a manual test run.
 */
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { isPlatformDbConfigured } from '@/db/admin-db';
import { isBedrockConfigured } from '@/lib/ask/bedrock';
import { serverLog } from '@/lib/log';
import { runDigestCron } from '@/lib/digest/cron';

// The job reads "now" and tenant data on every call — never cache.
export const dynamic = 'force-dynamic';

/** Constant-time bearer-token check against `CRON_SECRET`. Returns false if the secret is unset. */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail-closed: an unconfigured secret authorizes no one
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — guard first so a wrong-length token just fails.
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request, force: boolean): Promise<Response> {
  if (!isAuthorized(req)) {
    serverLog('digest', 'cronRoute', 'failure', { reason: 'unauthorized' });
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isPlatformDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'Cross-tenant connection not configured.' }, { status: 503 });
  }
  if (!isBedrockConfigured()) {
    return NextResponse.json({ ok: false, error: 'Bedrock is not configured.' }, { status: 503 });
  }

  try {
    const result = await runDigestCron({ force });
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    serverLog('digest', 'cronRoute', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return NextResponse.json({ ok: false, error: 'Digest cron failed.' }, { status: 500 });
  }
}

/** Scheduler entrypoint — runs the normal hour-gated pass. */
export function GET(req: Request): Promise<Response> {
  return handle(req, false);
}

/** Manual trigger — `?force=1` bypasses the hour / already-sent guards for an immediate send. */
export function POST(req: Request): Promise<Response> {
  const force = new URL(req.url).searchParams.get('force') === '1';
  return handle(req, force);
}
