/**
 * Daily care-scans cron endpoint — refill sweep, missed-dose reconciliation, decline alerts.
 *
 * Called on a schedule (vercel.json) with `Authorization: Bearer ${CRON_SECRET}`. Every sweep in
 * `runCareScans()` is idempotent per circle-local day, so re-fires are safe.
 *
 * 🔒 Security: a privileged, cross-tenant job (no user session) — gated by the shared `CRON_SECRET`
 * only the scheduler knows, exactly like /api/cron/digest. Fail-closed: an unset secret or a
 * non-matching bearer rejects every request. POST allows a manual test run with the same guard.
 */
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { isPlatformDbConfigured } from '@/db/admin-db';
import { serverLog } from '@/lib/log';
import { runCareScans } from '@/lib/scans/cron';

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

async function handle(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    serverLog('scans', 'cronRoute', 'failure', { reason: 'unauthorized' });
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isPlatformDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'Cross-tenant connection not configured.' }, { status: 503 });
  }

  try {
    const result = await runCareScans();
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    serverLog('scans', 'cronRoute', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return NextResponse.json({ ok: false, error: 'Care scans failed.' }, { status: 500 });
  }
}

/** Scheduler entrypoint. */
export function GET(req: Request): Promise<Response> {
  return handle(req);
}

/** Manual trigger (same guard) — handy for a demo or smoke test. */
export function POST(req: Request): Promise<Response> {
  return handle(req);
}
