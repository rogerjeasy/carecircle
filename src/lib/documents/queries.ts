import 'server-only';

/**
 * Read layer for the Documents vault — turns `document` rows into the `DocumentItem` shape the
 * grid renders, with the uploader resolved and S3 keys turned into short-lived URLs.
 *
 * Security (see AGENTS.md):
 *  - Reads go through `withAuthedDb()` (RLS-scoped) AND are pinned to the active circle. The
 *    sensitivity tiers are enforced by the document_select RLS policy (drizzle/0015), so a
 *    restricted/sensitive row a user may not see is never returned here in the first place.
 *  - The bucket is private; we only ever hand the client a short-lived presigned URL.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { documents, membership, users } from '@/db/schema';
import { resolveStoredUrl } from '@/lib/storage/s3';
import { avatarColorFor, formatSize, initialsFrom } from '@/components/documents/utils';
import type {
  DocCategory,
  DocumentItem,
  DocumentsData,
  FileKind,
  Sensitivity,
} from '@/components/documents/types';

const URL_TTL_SECONDS = 6 * 60 * 60; // 6h — long enough to open/preview without re-signing mid-session

/**
 * Load the active circle's documents the signed-in user is allowed to see (RLS-filtered by
 * sensitivity). Returns `null` if unauthenticated / no active circle.
 */
export async function getDocumentsData(): Promise<DocumentsData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('documents', 'getDocumentsData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const rows = await withAuthedDb((tx) =>
      tx
        .select({
          id: documents.id,
          title: documents.title,
          category: documents.category,
          sensitivity: documents.sensitivity,
          kind: documents.kind,
          s3Key: documents.s3Key,
          sizeBytes: documents.sizeBytes,
          expiresAt: documents.expiresAt,
          isEmergencyVisible: documents.isEmergencyVisible,
          createdAt: documents.createdAt,
          uploaderUserId: users.id,
          uploaderName: users.name,
        })
        .from(documents)
        .leftJoin(membership, eq(membership.id, documents.uploadedByMembershipId))
        .leftJoin(users, eq(users.id, membership.userId))
        .where(and(eq(documents.circleId, circleId), isNull(documents.deletedAt)))
        .orderBy(desc(documents.createdAt)),
    );

    const items: DocumentItem[] = await Promise.all(
      rows.map(async (r) => {
        const url = await resolveStoredUrl(r.s3Key, URL_TTL_SECONDS);
        const name = r.uploaderName ?? 'Someone';
        const uploaderId = r.uploaderUserId ?? r.id;
        return {
          id: r.id,
          title: r.title,
          category: r.category as DocCategory,
          sensitivity: r.sensitivity as Sensitivity,
          kind: r.kind as FileKind,
          size: formatSize(r.sizeBytes),
          uploadedById: uploaderId,
          uploaderName: name,
          uploaderInitials: initialsFrom(name),
          uploaderColor: avatarColorFor(uploaderId),
          uploadedAt: r.createdAt,
          expiresAt: r.expiresAt ?? undefined,
          onEmergencyCard: r.isEmergencyVisible,
          previewUrl: r.kind === 'image' ? url ?? undefined : undefined,
          downloadUrl: url ?? undefined,
        };
      }),
    );

    serverLog('documents', 'getDocumentsData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      documents: items.length,
    });

    return { circleId, documents: items };
  } catch (err) {
    serverLog('documents', 'getDocumentsData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
