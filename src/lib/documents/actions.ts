'use server';

/**
 * Documents vault server actions — upload, rename, delete, and emergency-card toggle.
 *
 * Security (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Each action re-checks `requireSession()` and re-authorizes against the user's REAL membership
 *    role in the active circle. The RLS policies (drizzle/0015) are the final backstop, and the
 *    sensitivity tiers there gate who can ever read a row.
 *  - All writes run through `withAuthedDb()` (RLS-scoped) and are audited (documents are sensitive).
 *  - Files are uploaded as FormData (Next's dev logger never prints FormData contents); the bucket
 *    is private and clients only ever receive short-lived presigned URLs.
 */
import { after } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { recordAuditEvent } from '@/db/audit';
import { serverLog } from '@/lib/log';
import { documents, membership } from '@/db/schema';
import { uploadFile, resolveStoredUrl, deleteObject } from '@/lib/storage/s3';
import { ingestDocumentById, removeSourceForActor } from '@/lib/rag/ingest';
import { avatarColorFor, initialsFrom, formatSize } from '@/components/documents/utils';
import { canManageDocs } from './access';
import type { DocCategory, DocumentItem, FileKind, Sensitivity } from '@/components/documents/types';

export type ActionError = { ok: false; error: string };
const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';
const URL_TTL_SECONDS = 6 * 60 * 60;

interface ActorContext {
  userId: string;
  name: string | null | undefined;
  circleId: string;
  membershipId: string;
  role: string;
}

async function getActorContext(): Promise<ActorContext | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ id: membership.id, role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.circleId, circleId),
          eq(membership.userId, user.id),
          eq(membership.status, 'active'),
          isNull(membership.deletedAt),
        ),
      )
      .limit(1),
  );
  if (!m) return null;
  return { userId: user.id, name: user.name, circleId, membershipId: m.id, role: m.role };
}

/** Classify an uploaded file into the vault's three display kinds. */
function kindOf(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'doc';
}

const uploadSchema = z.object({
  title: z.string().trim().min(1, 'A title is required').max(160),
  category: z.enum(['medical', 'insurance', 'legal', 'financial', 'id', 'advance-directive']),
  sensitivity: z.enum(['standard', 'sensitive', 'restricted']),
  expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  onEmergencyCard: z.boolean(),
});

export type UploadDocResult = { ok: true; data: DocumentItem } | ActionError;

/** Upload one file as a vault document. Returns the created DocumentItem for instant display. */
export async function uploadDocument(formData: FormData): Promise<UploadDocResult> {
  const ctx = await getActorContext();
  serverLog('documents', 'uploadDocument', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageDocs(ctx.role)) {
    serverLog('documents', 'uploadDocument', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }

  const file = formData.get('file');
  const parsed = uploadSchema.safeParse({
    title: formData.get('title')?.toString() ?? '',
    category: formData.get('category')?.toString() ?? '',
    sensitivity: formData.get('sensitivity')?.toString() ?? '',
    expiry: formData.get('expiry')?.toString() ?? '',
    onEmergencyCard: formData.get('onEmergencyCard')?.toString() === 'true',
  });
  if (!(file instanceof File) || file.size === 0 || !parsed.success) {
    serverLog('documents', 'uploadDocument', 'failure', { actor: ctx.userId, reason: 'validation' });
    return { ok: false, error: parsed.success ? 'Please choose a valid file.' : parsed.error.issues[0]?.message ?? 'Please check the details.' };
  }
  const p = parsed.data;
  const kind = kindOf(file);

  try {
    const uploaded = await uploadFile({ circleId: ctx.circleId, category: 'documents', file });
    if (!uploaded) {
      serverLog('documents', 'uploadDocument', 'failure', { actor: ctx.userId, reason: 'storage' });
      return { ok: false, error: 'Upload failed. Check that file storage is configured.' };
    }

    const [row] = await withAuthedDb(async (tx) => {
      const inserted = await tx
        .insert(documents)
        .values({
          circleId: ctx.circleId,
          title: p.title,
          category: p.category,
          sensitivity: p.sensitivity,
          kind,
          s3Key: uploaded.key,
          contentType: uploaded.contentType,
          fileName: uploaded.fileName,
          sizeBytes: uploaded.size,
          expiresAt: p.expiry ? new Date(`${p.expiry}T00:00:00`) : null,
          isEmergencyVisible: p.onEmergencyCard,
          uploadedByMembershipId: ctx.membershipId,
        })
        .returning({ id: documents.id, createdAt: documents.createdAt });
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'create', entityType: 'document', entityId: inserted[0].id, summary: `Uploaded a ${p.sensitivity} ${p.category} document` },
        tx,
      );
      return inserted;
    });

    // Index the document into the vector store after the response is sent (chunk → embed → upsert).
    after(() => ingestDocumentById(row.id, { userId: ctx.userId, circleId: ctx.circleId }));

    const url = await resolveStoredUrl(uploaded.key, URL_TTL_SECONDS);
    const name = ctx.name?.trim() || 'You';
    const dto: DocumentItem = {
      id: row.id,
      title: p.title,
      category: p.category as DocCategory,
      sensitivity: p.sensitivity as Sensitivity,
      kind,
      size: formatSize(uploaded.size),
      uploadedById: ctx.userId,
      uploaderName: name,
      uploaderInitials: initialsFrom(name),
      uploaderColor: avatarColorFor(ctx.userId),
      uploadedAt: row.createdAt,
      expiresAt: p.expiry ? new Date(`${p.expiry}T00:00:00`) : undefined,
      onEmergencyCard: p.onEmergencyCard,
      previewUrl: kind === 'image' ? url ?? undefined : undefined,
      downloadUrl: url ?? undefined,
    };

    serverLog('documents', 'uploadDocument', 'success', { actor: ctx.userId, id: row.id, kind });
    return { ok: true, data: dto };
  } catch (err) {
    serverLog('documents', 'uploadDocument', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type ActionResult = { ok: true } | ActionError;

/** Rename a document. */
export async function renameDocument(docId: string, title: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('documents', 'renameDocument', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageDocs(ctx.role)) return { ok: false, error: FORBIDDEN };
  const id = z.string().uuid().safeParse(docId);
  const clean = z.string().trim().min(1).max(160).safeParse(title);
  if (!id.success || !clean.success) return { ok: false, error: 'Please enter a valid title.' };

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(documents)
        .set({ title: clean.data, updatedAt: new Date() })
        .where(and(eq(documents.id, id.data), eq(documents.circleId, ctx.circleId), isNull(documents.deletedAt)))
        .returning({ id: documents.id });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'document', entityId: id.data, summary: 'Renamed a document' },
        tx,
      );
    });
    serverLog('documents', 'renameDocument', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('documents', 'renameDocument', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Soft-delete a document, then best-effort remove the S3 object. */
export async function deleteDocument(docId: string): Promise<ActionResult> {
  const ctx = await getActorContext();
  serverLog('documents', 'deleteDocument', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageDocs(ctx.role)) return { ok: false, error: FORBIDDEN };
  const id = z.string().uuid().safeParse(docId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    const removedKey = await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(documents)
        .set({ deletedAt: new Date() })
        .where(and(eq(documents.id, id.data), eq(documents.circleId, ctx.circleId), isNull(documents.deletedAt)))
        .returning({ s3Key: documents.s3Key });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'delete', entityType: 'document', entityId: id.data, summary: 'Deleted a document' },
        tx,
      );
      return row.s3Key;
    });
    await deleteObject(removedKey); // best-effort
    after(() => removeSourceForActor({ userId: ctx.userId, circleId: ctx.circleId }, 'document', id.data)); // drop its vectors too
    serverLog('documents', 'deleteDocument', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true };
  } catch (err) {
    serverLog('documents', 'deleteDocument', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type ToggleEmergencyResult = { ok: true; onEmergencyCard: boolean } | ActionError;

/** Flip whether a document appears on the emergency card. */
export async function toggleEmergencyCard(docId: string): Promise<ToggleEmergencyResult> {
  const ctx = await getActorContext();
  serverLog('documents', 'toggleEmergencyCard', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!canManageDocs(ctx.role)) return { ok: false, error: FORBIDDEN };
  const id = z.string().uuid().safeParse(docId);
  if (!id.success) return { ok: false, error: GENERIC_ERROR };

  try {
    const next = await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(documents)
        .set({ isEmergencyVisible: sql`not ${documents.isEmergencyVisible}`, updatedAt: new Date() })
        .where(and(eq(documents.id, id.data), eq(documents.circleId, ctx.circleId), isNull(documents.deletedAt)))
        .returning({ value: documents.isEmergencyVisible });
      if (!row) throw new Error('not_found_or_forbidden');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'document', entityId: id.data, summary: row.value ? 'Added a document to the emergency card' : 'Removed a document from the emergency card' },
        tx,
      );
      return row.value;
    });
    serverLog('documents', 'toggleEmergencyCard', 'success', { actor: ctx.userId, id: id.data });
    return { ok: true, onEmergencyCard: next };
  } catch (err) {
    serverLog('documents', 'toggleEmergencyCard', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
