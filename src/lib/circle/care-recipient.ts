'use server';

/**
 * Resolves the care recipient at the center of the signed-in user's primary circle — used to
 * show the recipient's real name + photo on the dashboard (e.g. the status banner avatar).
 *
 * Security (see AGENTS.md):
 *  - The recipient profile is tenant data, read through `withAuthedDb()` (RLS-scoped), so a user
 *    can only ever see the recipient of a circle they belong to.
 *  - The stored `avatarUrl` is an S3 object key (private bucket); it is resolved to a short-lived
 *    presigned URL via `resolveStoredUrl()` before crossing to the client. The raw key never leaks.
 *  - Operational `serverLog` only — rendering a recipient's name/photo in their own circle is
 *    normal app data, not a sensitive cross-tenant export.
 */
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { careRecipientProfile } from '@/db/schema';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { resolveStoredUrl } from '@/lib/storage/s3';
import { serverLog, maskEmail } from '@/lib/log';

export interface CareRecipient {
  fullName: string;
  /** Two-letter monogram for the avatar fallback. */
  initials: string;
  /** Ready-to-use image URL (presigned for S3 keys), or null when there's no photo. */
  avatarUrl: string | null;
}

/** Derive a two-letter monogram from a name. */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The care recipient of the user's ACTIVE circle (cookie-resolved, validated — the same circle
 * `getCurrentUser()` resolves the role from), or `null` if unauthenticated / none yet. Safe to
 * call from a client component: only serializable, non-sensitive fields cross the boundary.
 */
export async function getCareRecipient(): Promise<CareRecipient | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  try {
    // Scope strictly to the active circle's recipient (RLS additionally guarantees the user is a
    // member of it). No active circle → no recipient.
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('circle', 'getCareRecipient', 'success', {
        email: maskEmail(session.user?.email),
        found: false,
      });
      return null;
    }

    const [row] = await withAuthedDb((tx) =>
      tx
        .select({
          fullName: careRecipientProfile.fullName,
          avatarKey: careRecipientProfile.avatarUrl,
        })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1),
    );

    if (!row) {
      serverLog('circle', 'getCareRecipient', 'success', {
        email: maskEmail(session.user?.email),
        found: false,
      });
      return null;
    }

    // Resolve the stored S3 key (or passthrough data:/https:) to a viewable, short-lived URL.
    const avatarUrl = await resolveStoredUrl(row.avatarKey);

    serverLog('circle', 'getCareRecipient', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      hasPhoto: Boolean(avatarUrl),
    });

    return {
      fullName: row.fullName,
      initials: initialsFrom(row.fullName),
      avatarUrl,
    };
  } catch (err) {
    serverLog('circle', 'getCareRecipient', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
