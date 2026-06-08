import 'server-only';

/**
 * Vector retrieval for Ask — embed the question and fetch the nearest `rag_chunk` rows the caller is
 * allowed to see, then shape them into (a) a grounded context block the model cites by tag and
 * (b) deduped SourceRef cards for the UI.
 *
 * Security: the query runs through `withAuthedDb()` (RLS), so the rag_chunk SELECT policy filters by
 * circle membership AND sensitivity tier — a member can never retrieve a chunk they couldn't read
 * in the vault. No application-side sensitivity filter is needed; the database enforces it.
 */
import { format } from 'date-fns';
import { withAuthedDb } from '@/db/dal';
import { embedQuery } from './embeddings';
import { queryChunks } from './pgvector';
import type { RagSource } from './types';
import type { SourceRef, SourceType } from '@/components/ask/types';

/** Map a RAG source kind to the UI's source-card type (drives the icon). */
const SOURCE_TYPE: Record<RagSource, SourceType> = {
  document: 'document',
  timeline: 'timeline',
  audit: 'note',
};

export interface VectorContext {
  /** Tagged context lines the model cites ([V1] …), or '' when nothing relevant was found. */
  contextText: string;
  sources: SourceRef[];
}

/**
 * Retrieve the top chunks for a question, scoped to the active circle. `tagStart` offsets tag
 * numbers so vector sources don't collide with the structured-snapshot tags.
 */
export async function retrieveVectorContext(opts: {
  circleId: string;
  question: string;
  topK?: number;
  tagStart?: number;
}): Promise<VectorContext> {
  const vector = await embedQuery(opts.question);
  const matches = await withAuthedDb((tx) =>
    queryChunks(tx, { circleId: opts.circleId, vector, topK: opts.topK ?? 8 }),
  );
  if (matches.length === 0) return { contextText: '', sources: [] };

  let n = opts.tagStart ?? 0;
  const lines: string[] = [];
  const sources: SourceRef[] = [];
  const seenSource = new Set<string>();

  for (const m of matches) {
    const tag = `V${++n}`;
    lines.push(`[${tag}] (from ${m.title}) ${m.content}`);

    // One source card per underlying record (a doc may contribute several chunks).
    const key = `${m.source}:${m.sourceId}`;
    if (!seenSource.has(key)) {
      seenSource.add(key);
      let time = '';
      try {
        time = format(m.sourceCreatedAt, 'MMM d, yyyy');
      } catch {
        time = '';
      }
      sources.push({
        id: tag,
        type: SOURCE_TYPE[m.source] ?? 'note',
        label: m.title,
        detail: m.detail,
        time,
        href: m.href,
      });
    }
  }

  return { contextText: lines.join('\n'), sources };
}
