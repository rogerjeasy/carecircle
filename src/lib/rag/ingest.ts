import 'server-only';

/**
 * Ingestion: turn a source record (document / timeline / audit) into embedded, tenant-scoped,
 * sensitivity-tagged rows in the `rag_chunk` pgvector table.
 *
 * Flow:  load record → extract text → chunk → embed (Bedrock Titan) → upsert into Aurora.
 *
 * Writes go through a `RagStore`:
 *  - `actorStore` runs each write under the actor's RLS context (`withUserContext`). Used by the
 *    `after()` hooks on upload / post, where the actor is already authorised for that circle.
 *  - `adminStore` uses a caller-provided privileged handle (the admin-gated /api/ingest backfill)
 *    so it can index EVERY row, including restricted ones; read access is still enforced at query
 *    time by the rag_chunk SELECT policy.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { withUserContext } from '@/db/rls';
import { documents, timelineEvent, auditLog } from '@/db/schema';
import { getObjectBytes } from '@/lib/storage/s3';
import { serverLog } from '@/lib/log';
import { embedTexts } from './embeddings';
import { upsertChunks, deleteSource, type DbLike } from './pgvector';
import { extractText, chunkText, isExtractable } from './chunk';
import type { ChunkRow, IngestActor, RagSensitivity, RagSource, RagStore } from './types';

/**
 * Audit actions worth embedding (care-relevant state changes). We skip 'read'/'login'/'logout' —
 * those are access noise and embedding them would turn Ask into a surveillance tool. Values match
 * the `audit_action` enum (src/db/schema/app.ts).
 */
const INGESTIBLE_AUDIT_ACTIONS = new Set(['create', 'update', 'delete', 'export', 'invite']);

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

/** Writes run as the actor (RLS-enforced) — used by the upload/post `after()` hooks. */
export function actorStore(actor: IngestActor): RagStore {
  return {
    upsert: (rows) => withUserContext(actor.userId, (tx) => upsertChunks(tx, rows)),
    remove: (circleId, source, sourceId) =>
      withUserContext(actor.userId, (tx) => deleteSource(tx, circleId, source, sourceId)),
  };
}

/** Writes run via a privileged handle (RLS-bypassing) — used by the admin backfill route. */
export function adminStore(db: DbLike): RagStore {
  return {
    upsert: (rows) => upsertChunks(db, rows),
    remove: (circleId, source, sourceId) => deleteSource(db, circleId, source, sourceId),
  };
}

/** Remove a source's vectors as the actor (used when a document is deleted). */
export function removeSourceForActor(actor: IngestActor, source: RagSource, sourceId: string): Promise<void> {
  return actorStore(actor).remove(actor.circleId, source, sourceId);
}

// ---------------------------------------------------------------------------
// Core: chunk → embed → upsert
// ---------------------------------------------------------------------------

interface IngestTextInput {
  circleId: string;
  source: RagSource;
  sourceId: string;
  sensitivity: RagSensitivity;
  title: string;
  detail: string;
  href: string;
  text: string;
  sourceCreatedAt: Date;
}

/** Chunk, embed, and upsert one source's text. Returns the number of vectors written. */
export async function ingestText(input: IngestTextInput, store: RagStore): Promise<number> {
  const chunks = await chunkText(input.text);
  if (chunks.length === 0) {
    // Nothing extractable — clear any stale vectors so edits/deletes don't linger.
    await store.remove(input.circleId, input.source, input.sourceId);
    return 0;
  }

  const embeddings = await embedTexts(chunks);
  const rows: ChunkRow[] = chunks.map((content, i) => ({
    circleId: input.circleId,
    source: input.source,
    sourceId: input.sourceId,
    sensitivity: input.sensitivity,
    title: input.title.slice(0, 200),
    detail: input.detail.slice(0, 200),
    href: input.href,
    chunkIndex: i,
    chunkCount: chunks.length,
    content,
    embedding: embeddings[i],
    sourceCreatedAt: input.sourceCreatedAt,
  }));

  await store.upsert(rows);
  return rows.length;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

interface DocRow {
  id: string;
  circleId: string;
  title: string;
  category: string;
  sensitivity: RagSensitivity;
  s3Key: string;
  contentType: string | null;
  fileName: string | null;
  createdAt: Date;
}

async function selectDocument(db: DbLike, circleId: string, documentId: string): Promise<DocRow | null> {
  const [row] = await db
    .select({
      id: documents.id,
      circleId: documents.circleId,
      title: documents.title,
      category: documents.category,
      sensitivity: documents.sensitivity,
      s3Key: documents.s3Key,
      contentType: documents.contentType,
      fileName: documents.fileName,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.circleId, circleId), isNull(documents.deletedAt)))
    .limit(1);
  return (row as DocRow) ?? null;
}

/** Index one document row (download from S3, extract, chunk, embed, upsert). */
export async function indexDocumentRow(row: DocRow, store: RagStore): Promise<number> {
  if (!isExtractable(row.contentType, row.fileName)) {
    serverLog('rag', 'indexDocument', 'success', { id: row.id, skipped: 'not_text' });
    return 0;
  }
  const bytes = await getObjectBytes(row.s3Key);
  if (!bytes) {
    serverLog('rag', 'indexDocument', 'failure', { id: row.id, reason: 'no_bytes' });
    return 0;
  }
  const text = await extractText(bytes, row.contentType, row.fileName);
  const n = await ingestText(
    {
      circleId: row.circleId,
      source: 'document',
      sourceId: row.id,
      sensitivity: row.sensitivity,
      title: row.title,
      detail: `${row.category} document`,
      href: '/documents',
      text,
      sourceCreatedAt: row.createdAt,
    },
    store,
  );
  serverLog('rag', 'indexDocument', 'success', { id: row.id, chunks: n });
  return n;
}

/** Ingest a document by id under the actor's RLS context (used by the upload `after()` hook). */
export async function ingestDocumentById(documentId: string, actor: IngestActor): Promise<void> {
  try {
    const row = await withUserContext(actor.userId, (tx) => selectDocument(tx, actor.circleId, documentId));
    if (row) await indexDocumentRow(row, actorStore(actor));
  } catch (err) {
    serverLog('rag', 'ingestDocumentById', 'failure', { id: documentId, reason: (err as Error)?.name ?? 'error' });
  }
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

interface TimelineRow {
  id: string;
  circleId: string;
  summary: string;
  payload: unknown;
  occurredAt: Date;
}

function timelineText(row: TimelineRow): string {
  const body = row.payload && typeof row.payload === 'object' ? (row.payload as { body?: unknown }).body : null;
  return [row.summary, typeof body === 'string' ? body : ''].filter(Boolean).join('\n\n');
}

export async function indexTimelineRow(row: TimelineRow, store: RagStore): Promise<number> {
  return ingestText(
    {
      circleId: row.circleId,
      source: 'timeline',
      sourceId: row.id,
      sensitivity: 'standard', // timeline is visible to the circle
      title: row.summary,
      detail: 'Timeline update',
      href: '/timeline',
      text: timelineText(row),
      sourceCreatedAt: row.occurredAt,
    },
    store,
  );
}

/** Ingest a timeline event by id under the actor's RLS context (used by the post `after()` hook). */
export async function ingestTimelineById(eventId: string, actor: IngestActor): Promise<void> {
  try {
    const row = await withUserContext(actor.userId, async (tx) => {
      const [r] = await tx
        .select({
          id: timelineEvent.id,
          circleId: timelineEvent.circleId,
          summary: timelineEvent.summary,
          payload: timelineEvent.payload,
          occurredAt: timelineEvent.occurredAt,
        })
        .from(timelineEvent)
        .where(and(eq(timelineEvent.id, eventId), eq(timelineEvent.circleId, actor.circleId)))
        .limit(1);
      return r as TimelineRow | undefined;
    });
    if (row) await indexTimelineRow(row, actorStore(actor));
  } catch (err) {
    serverLog('rag', 'ingestTimelineById', 'failure', { id: eventId, reason: (err as Error)?.name ?? 'error' });
  }
}

// ---------------------------------------------------------------------------
// Audit entries — ingested as 'restricted' (only owner/family_admin/family retrieve them).
// ---------------------------------------------------------------------------

interface AuditRow {
  id: string;
  circleId: string;
  action: string;
  entityType: string | null;
  summary: string | null;
  occurredAt: Date;
}

export async function indexAuditRow(row: AuditRow, store: RagStore): Promise<number> {
  if (!INGESTIBLE_AUDIT_ACTIONS.has(row.action)) return 0;
  const text = row.summary?.trim() || `${row.action} ${row.entityType ?? ''}`.trim();
  if (!text) return 0;
  return ingestText(
    {
      circleId: row.circleId,
      source: 'audit',
      sourceId: row.id,
      sensitivity: 'restricted', // ledger entries reveal who-did-what; keep to coordinators
      title: text,
      detail: `Activity · ${row.entityType ?? row.action}`,
      href: '/timeline',
      text,
      sourceCreatedAt: row.occurredAt,
    },
    store,
  );
}

// ---------------------------------------------------------------------------
// Backfill / re-index a whole circle (admin-gated /api/ingest route).
// ---------------------------------------------------------------------------

export interface BackfillResult {
  documents: number;
  timeline: number;
  audit: number;
  vectors: number;
}

/**
 * Re-index every document, timeline event, and care-relevant audit entry in one circle. `db` is the
 * caller-provided privileged handle (the admin route passes the RLS-bypassing connection so ALL
 * rows are indexed; read access is still enforced later by the per-tier SELECT policy).
 */
export async function backfillCircle(db: DbLike, circleId: string): Promise<BackfillResult> {
  const out: BackfillResult = { documents: 0, timeline: 0, audit: 0, vectors: 0 };
  const store = adminStore(db);

  const docRows = (await db
    .select({
      id: documents.id,
      circleId: documents.circleId,
      title: documents.title,
      category: documents.category,
      sensitivity: documents.sensitivity,
      s3Key: documents.s3Key,
      contentType: documents.contentType,
      fileName: documents.fileName,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.circleId, circleId), isNull(documents.deletedAt)))) as DocRow[];
  for (const row of docRows) {
    const n = await indexDocumentRow(row, store);
    if (n > 0) out.documents += 1;
    out.vectors += n;
  }

  const tlRows = (await db
    .select({
      id: timelineEvent.id,
      circleId: timelineEvent.circleId,
      summary: timelineEvent.summary,
      payload: timelineEvent.payload,
      occurredAt: timelineEvent.occurredAt,
    })
    .from(timelineEvent)
    .where(eq(timelineEvent.circleId, circleId))) as TimelineRow[];
  for (const row of tlRows) {
    const n = await indexTimelineRow(row, store);
    if (n > 0) out.timeline += 1;
    out.vectors += n;
  }

  const auditRows = (await db
    .select({
      id: auditLog.id,
      circleId: auditLog.circleId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      summary: auditLog.summary,
      occurredAt: auditLog.occurredAt,
    })
    .from(auditLog)
    .where(eq(auditLog.circleId, circleId))) as AuditRow[];
  for (const row of auditRows) {
    const n = await indexAuditRow(row, store);
    if (n > 0) out.audit += 1;
    out.vectors += n;
  }

  serverLog('rag', 'backfillCircle', 'success', { circleId, ...out });
  return out;
}
