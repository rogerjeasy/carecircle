import 'server-only';

/**
 * Shared types for the RAG pipeline (ingest → embed → pgvector → retrieve).
 *
 * The vector store is Aurora itself (the `rag_chunk` table, pgvector). One row = one embedded text
 * chunk of a source record, tenant-scoped + sensitivity-tagged so the SAME RLS that guards
 * documents guards retrieval.
 */

/** What kind of record a chunk came from. */
export type RagSource = 'document' | 'timeline' | 'audit';

/** Sensitivity tiers (mirror the document RLS tiers). */
export type RagSensitivity = 'standard' | 'sensitive' | 'restricted';

/** A chunk row ready to insert into `rag_chunk` (embedding already computed). */
export interface ChunkRow {
  circleId: string;
  source: RagSource;
  sourceId: string;
  sensitivity: RagSensitivity;
  title: string;
  detail: string;
  href: string;
  chunkIndex: number;
  chunkCount: number;
  content: string;
  embedding: number[];
  sourceCreatedAt: Date;
}

/** One scored chunk returned from a similarity query. */
export interface RetrievedChunk {
  source: RagSource;
  sourceId: string;
  sensitivity: RagSensitivity;
  title: string;
  detail: string;
  href: string;
  content: string;
  sourceCreatedAt: Date;
  score: number;
}

/** Identifies who triggered an ingest, so the worker can run under the right RLS context. */
export interface IngestActor {
  userId: string;
  circleId: string;
}

/**
 * Where chunks get written/removed. Two implementations (see ingest.ts):
 *  - actor store → runs under the actor's RLS context (`withUserContext`)
 *  - admin store → uses the privileged connection (backfill across every tier)
 */
export interface RagStore {
  upsert(rows: ChunkRow[]): Promise<number>;
  remove(circleId: string, source: RagSource, sourceId: string): Promise<void>;
}
