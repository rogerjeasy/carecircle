/**
 * GET /api/admin/system — live system-health snapshot for the platform console.
 *
 * Gated by `requirePlatformAdmin()` (defense-in-depth: the /admin layout already checks it, but a
 * route handler must never trust that — it re-checks here). Returns measured service statuses +
 * operational metrics. Polled by the admin System page for a live status view.
 */
import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/db/dal';
import { getSystemHealth } from '@/lib/admin/system-health';

// Health is real-time — never cache.
export const dynamic = 'force-dynamic';

export async function GET() {
  // Redirects non-admins; throwing/redirecting here means the route is never reachable unauthorized.
  await requirePlatformAdmin();

  try {
    const data = await getSystemHealth();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[api/admin/system] failed:', (err as Error)?.name);
    return NextResponse.json({ error: 'health_check_failed' }, { status: 503 });
  }
}
