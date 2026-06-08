import 'server-only';

/**
 * RAG configuration — embeddings (Amazon Bedrock Titan) and the embedding dimension.
 *
 * The vector store is now Aurora itself (pgvector), so there's no external vector-DB key. RAG is
 * "configured" when Bedrock is reachable (region + AWS credentials); the embedding model id is
 * read from env with a Titan default. Generation (Claude) is configured separately in bedrock.ts.
 *
 * Secrets stay server-side (AGENTS.md §5) — this module is `server-only`.
 */
import { RAG_EMBEDDING_DIM } from '@/db/schema';

export interface EmbeddingConfig {
  modelId: string;
  dimensions: number;
}

/** Embedding dimension — MUST equal the `vector(N)` column in the rag_chunk migration. */
export const EMBEDDING_DIMENSION = RAG_EMBEDDING_DIM;

/** True when Bedrock is reachable for embeddings (region + AWS credentials present). */
export function isRagConfigured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      (process.env.AWS_ACCESS_KEY_ID ||
        process.env.AWS_ROLE_ARN ||
        process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
        process.env.AWS_PROFILE),
  );
}

/** Read the Bedrock embedding config, or throw a clear, secret-free error. */
export function getEmbeddingConfig(): EmbeddingConfig {
  if (!isRagConfigured()) {
    throw new Error('Bedrock is not configured for embeddings (set AWS_REGION + AWS credentials).');
  }
  // Amazon Titan Text Embeddings v2 — 1024-d by default, all-AWS, no external embedding provider.
  return {
    modelId: process.env.BEDROCK_EMBED_MODEL_ID || 'amazon.titan-embed-text-v2:0',
    dimensions: EMBEDDING_DIMENSION,
  };
}
