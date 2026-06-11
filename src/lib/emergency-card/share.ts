import 'server-only';

/**
 * Emergency-card share links — the read layer for both sides of the feature:
 *
 *  - `getActiveEmergencyShare()` (signed-in): the active circle's current live link, RLS-scoped.
 *    Any member may see it (the card page shows the QR + expiry); only coordinators create/revoke
 *    (see actions.ts + the 0041 RLS policy).
 *  - `getSharedEmergencyCard(token)` (anonymous): resolves a public `/e/<token>` view. EMS/ER staff
 *    have no account, so — exactly like the invitation link — possession of the unguessable,
 *    expiring, revocable capability token IS the authorization. The lookup runs on the privileged
 *    connection (an anonymous visitor can't satisfy any RLS policy, by design), is constrained to
 *    a single non-revoked, non-expired row, and EVERY view bumps `view_count` and writes a `read`
 *    row to the append-only audit log — the family always knows the card was opened.
 *
 * 🔒 The public payload is the same projection members see on /emergency-card (name, allergies,
 * meds, contacts…) — never documents, vitals history, or anything beyond the card itself.
 */
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { withAuthedDb } from '@/db/dal';
import { getPlatformDb, isPlatformDbConfigured } from '@/db/admin-db';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { getAppOrigin } from '@/lib/url';
import { emergencyCardShare, auditLog } from '@/db/schema';
import { fetchEmergencyCardRows, assembleEmergencyCard } from './queries';
import type { EmergencyCardData } from '@/components/profile/data';

export interface EmergencyShareInfo {
  /** Absolute public URL (`https://…/e/<token>`) — what the QR encodes. */
  url: string;
  expiresAt: Date;
  viewCount: number;
  lastViewedAt: Date | null;
}

/** Tokens are `randomToken()` base64url — reject anything else before touching the DB. */
const TOKEN_RE = /^[A-Za-z0-9_-]{20,128}$/;

/** The active circle's live (non-revoked, non-expired) share link, if any. RLS-scoped. */
export async function getActiveEmergencyShare(): Promise<EmergencyShareInfo | null> {
  const circleId = await getActiveCircleId();
  if (!circleId) return null;

  try {
    const [row] = await withAuthedDb((tx) =>
      tx
        .select({
          token: emergencyCardShare.token,
          expiresAt: emergencyCardShare.expiresAt,
          viewCount: emergencyCardShare.viewCount,
          lastViewedAt: emergencyCardShare.lastViewedAt,
        })
        .from(emergencyCardShare)
        .where(
          and(
            eq(emergencyCardShare.circleId, circleId),
            isNull(emergencyCardShare.revokedAt),
            gt(emergencyCardShare.expiresAt, new Date()),
          ),
        )
        .limit(1),
    );
    if (!row) return null;

    const origin = await getAppOrigin();
    return {
      url: `${origin}/e/${row.token}`,
      expiresAt: row.expiresAt,
      viewCount: row.viewCount,
      lastViewedAt: row.lastViewedAt,
    };
  } catch (err) {
    serverLog('emergency', 'getActiveEmergencyShare', 'failure', {
      reason: (err as Error)?.name ?? 'error',
    });
    return null;
  }
}

export type SharedCardResult =
  | { status: 'ok'; card: EmergencyCardData; expiresAt: Date }
  | { status: 'invalid' };

/**
 * Resolve a public share token to the card it unlocks. Returns `invalid` for anything that isn't
 * a live link (unknown, revoked, expired, malformed) — one indistinguishable answer, no oracle.
 */
export async function getSharedEmergencyCard(token: string): Promise<SharedCardResult> {
  if (!TOKEN_RE.test(token)) return { status: 'invalid' };
  if (!isPlatformDbConfigured()) {
    serverLog('emergency', 'sharedCardView', 'failure', { reason: 'platform_db_unconfigured' });
    return { status: 'invalid' };
  }

  try {
    const db = getPlatformDb();
    const [share] = await db
      .select()
      .from(emergencyCardShare)
      .where(
        and(
          eq(emergencyCardShare.token, token),
          isNull(emergencyCardShare.revokedAt),
          gt(emergencyCardShare.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!share) {
      serverLog('emergency', 'sharedCardView', 'failure', { reason: 'not_found_or_expired' });
      return { status: 'invalid' };
    }

    const rows = await fetchEmergencyCardRows(db, share.circleId);
    const card = await assembleEmergencyCard(rows);
    if (!card) return { status: 'invalid' };

    // Count + audit the view (best-effort — a logging hiccup must never block EMS).
    try {
      await db
        .update(emergencyCardShare)
        .set({ viewCount: sql`${emergencyCardShare.viewCount} + 1`, lastViewedAt: new Date() })
        .where(eq(emergencyCardShare.id, share.id));
      await db.insert(auditLog).values({
        circleId: share.circleId,
        action: 'read',
        entityType: 'emergency_card_share',
        entityId: share.id,
        summary: 'Emergency card opened via public share link',
      });
    } catch (err) {
      console.error('[emergency] failed to record share view:', (err as Error)?.name ?? 'error');
    }

    serverLog('emergency', 'sharedCardView', 'success', { share: share.id });
    return { status: 'ok', card, expiresAt: share.expiresAt };
  } catch (err) {
    serverLog('emergency', 'sharedCardView', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return { status: 'invalid' };
  }
}
