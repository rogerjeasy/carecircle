import 'server-only';

/**
 * pgvector store — the RAG vector index lives INSIDE Aurora (the `rag_chunk` table).
 *
 * 🔒 Isolation is the database's job here, not application code: every query runs through an
 * RLS-scoped handle, so the `rag_chunk` SELECT policy (drizzle/0026) filters by circle membership
 * AND sensitivity tier automatically — a similarity search can only return chunks the caller may
 * read. Backfill passes the privileged (RLS-bypassing) connection to (re)index every tier.
 */
import { and, eq, sql } from 'drizzle-orm';
import { ragChunk } from '@/db/schema';
import type { Tx } from '@/db/rls';
import type { ChunkRow, RagSource, RetrievedChunk } from './types';

/** Any Drizzle handle that can read/write — the RLS tx OR the privileged admin db. */
export type DbLike = Pick<Tx, 'select' | 'insert' | 'delete'>;

/** Format a JS number[] as a pgvector literal (`[0.1,0.2,…]`). */
function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

/** Upsert chunk rows (re-ingest overwrites in place via the (source, source_id, chunk_index) key). */
export async function upsertChunks(db: DbLike, rows: ChunkRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  await db
    .insert(ragChunk)
    .values(rows)
    .onConflictDoUpdate({
      target: [ragChunk.source, ragChunk.sourceId, ragChunk.chunkIndex],
      set: {
        circleId: sql`excluded.circle_id`,
        sensitivity: sql`excluded.sensitivity`,
        title: sql`excluded.title`,
        detail: sql`excluded.detail`,
        href: sql`excluded.href`,
        chunkCount: sql`excluded.chunk_count`,
        content: sql`excluded.content`,
        embedding: sql`excluded.embedding`,
        sourceCreatedAt: sql`excluded.source_created_at`,
        updatedAt: sql`now()`,
      },
    });
  return rows.length;
}

/**
 * Cosine-similarity search within a circle. RLS on `db` filters to the tiers the caller may read;
 * we also pin `circle_id` for the index. Returns the nearest `topK` chunks, most-similar first.
 */
export async function queryChunks(
  db: DbLike,
  opts: { circleId: string; vector: number[]; topK: number },
): Promise<RetrievedChunk[]> {
  const lit = toVectorLiteral(opts.vector);
  const rows = await db
    .select({
      source: ragChunk.source,
      sourceId: ragChunk.sourceId,
      sensitivity: ragChunk.sensitivity,
      title: ragChunk.title,
      detail: ragChunk.detail,
      href: ragChunk.href,
      content: ragChunk.content,
      sourceCreatedAt: ragChunk.sourceCreatedAt,
      // Cosine distance → similarity score in [0,1]; handy for thresholds/debugging.
      score: sql<number>`1 - ("rag_chunk"."embedding" <=> ${lit}::vector)`,
    })
    .from(ragChunk)
    .where(eq(ragChunk.circleId, opts.circleId))
    .orderBy(sql`"rag_chunk"."embedding" <=> ${lit}::vector`)
    .limit(opts.topK);
  return rows as RetrievedChunk[];
}

/** Delete every chunk belonging to one source object (e.g. a deleted document). */
export async function deleteSource(
  db: DbLike,
  circleId: string,
  source: RagSource,
  sourceId: string,
): Promise<void> {
  await db
    .delete(ragChunk)
    .where(and(eq(ragChunk.circleId, circleId), eq(ragChunk.source, source), eq(ragChunk.sourceId, sourceId)));
}
