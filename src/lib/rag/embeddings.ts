import 'server-only';

/**
 * Embeddings via Amazon Bedrock — Titan Text Embeddings v2 (`amazon.titan-embed-text-v2:0`).
 *
 * All-AWS: no external embedding provider. Titan embeds ONE input string per InvokeModel call, so
 * we fan out chunks with a small concurrency limit. The client is created lazily (dynamic import)
 * and a missing region/credentials fails loudly via config.ts.
 */
import { getEmbeddingConfig } from './config';

let _client: import('@aws-sdk/client-bedrock-runtime').BedrockRuntimeClient | null = null;
async function client() {
  if (!_client) {
    const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
    _client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  }
  return _client;
}

/** Embed one string with Titan. */
async function embedOne(text: string, modelId: string, dimensions: number): Promise<number[]> {
  const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const c = await client();
  const res = await c.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: text.slice(0, 8000), dimensions, normalize: true }),
    }),
  );
  const parsed = JSON.parse(new TextDecoder().decode(res.body)) as { embedding?: number[] };
  if (!parsed.embedding) throw new Error('Titan returned no embedding');
  return parsed.embedding;
}

/** Run async tasks with a bounded concurrency, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let i = cursor++; i < items.length; i = cursor++) {
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Embed many texts, preserving order. Throws if Bedrock isn't configured. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { modelId, dimensions } = getEmbeddingConfig();
  const clean = texts.map((t) => t.replace(/\n/g, ' '));
  // Titan is one-input-per-call; 4-way concurrency keeps ingest snappy without tripping throttles.
  return mapLimit(clean, 4, (t) => embedOne(t, modelId, dimensions));
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const { modelId, dimensions } = getEmbeddingConfig();
  return embedOne(text.replace(/\n/g, ' '), modelId, dimensions);
}
