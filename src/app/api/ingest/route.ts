/**
 * POST /api/ingest — (re)index a circle's records into the vector store.
 *
 * This is a privileged, cross-tenant maintenance endpoint (it must read EVERY row in a circle,
 * including restricted documents, so it uses the RLS-bypassing admin connection). Access is
 * therefore gated to PLATFORM ADMINS only and every run is logged (AGENTS.md → Platform super-admin).
 *
 * Body: { "circleId"?: string }  — omit to backfill ALL circles.
 *
 * New documents/timeline posts are indexed automatically via `after()` hooks; this route is for
 * backfilling historical data (and audit entries, which have no per-write hook) or re-indexing.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isPlatformAdminEmail } from '@/lib/admin/access';
import { getPlatformDb, isPlatformDbConfigured, logPlatformAccess } from '@/db/admin-db';
import { careCircle } from '@/db/schema';
import { serverLog, maskEmail } from '@/lib/log';
import { isRagConfigured } from '@/lib/rag/config';
import { backfillCircle, type BackfillResult } from '@/lib/rag/ingest';

const bodySchema = z.object({ circleId: z.string().uuid().optional() });

export async function POST(req: Request) {
  const session = await auth();
  serverLog('rag', 'ingestRoute', 'start', { email: maskEmail(session?.user?.email) });

  // Fail-closed: valid session AND platform-admin allowlist.
  if (!session?.user?.id || !isPlatformAdminEmail(session.user.email)) {
    serverLog('rag', 'ingestRoute', 'failure', { reason: 'forbidden' });
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  if (!isRagConfigured()) {
    return NextResponse.json({ ok: false, error: 'RAG not configured (AWS_REGION + credentials for Bedrock embeddings).' }, { status: 503 });
  }
  if (!isPlatformDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'Admin connection not configured.' }, { status: 503 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid body.' }, { status: 400 });

  try {
    const db = getPlatformDb();
    const circleIds = parsed.data.circleId
      ? [parsed.data.circleId]
      : (await db.select({ id: careCircle.id }).from(careCircle)).map((r) => r.id);

    logPlatformAccess(
      { id: session.user.id, email: session.user.email },
      'rag-backfill',
      { circles: circleIds.length },
    );

    const totals: BackfillResult = { documents: 0, timeline: 0, audit: 0, vectors: 0 };
    for (const id of circleIds) {
      const r = await backfillCircle(db, id);
      totals.documents += r.documents;
      totals.timeline += r.timeline;
      totals.audit += r.audit;
      totals.vectors += r.vectors;
    }

    serverLog('rag', 'ingestRoute', 'success', { circles: circleIds.length, vectors: totals.vectors });
    return NextResponse.json({ ok: true, circles: circleIds.length, ...totals });
  } catch (err) {
    serverLog('rag', 'ingestRoute', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return NextResponse.json({ ok: false, error: 'Ingest failed.' }, { status: 500 });
  }
}
