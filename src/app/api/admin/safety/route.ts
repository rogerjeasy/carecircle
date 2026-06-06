/**
 * GET /api/admin/safety — live cross-tenant safety-alert feed for the platform console.
 *
 * Gated by `requirePlatformAdmin()`. The underlying read is on the privileged (RLS-bypassing)
 * connection, so it is itself recorded via `logPlatformAccess()` — every cross-tenant view of
 * tenant data is logged (AGENTS.md). Polled by the admin System page.
 */
import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/db/dal';
import { isPlatformDbConfigured } from '@/db/admin-db';
import { getSafetyAlerts } from '@/db/admin-queries';
import type { SafetyData } from '@/lib/admin/system-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requirePlatformAdmin();

  // No cross-tenant connection in this deployment → honest empty feed, not a crash.
  if (!isPlatformDbConfigured()) {
    return NextResponse.json<SafetyData>(
      { alerts: [], checkedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const alerts = await getSafetyAlerts({ id: admin.id, email: admin.email });
    return NextResponse.json<SafetyData>(
      { alerts, checkedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/admin/safety] failed:', (err as Error)?.name);
    return NextResponse.json({ error: 'safety_read_failed' }, { status: 503 });
  }
}
