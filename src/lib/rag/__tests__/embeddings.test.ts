/**
 * Titan embeddings tests — the Bedrock SDK is fully MOCKED (no real AWS calls, no network).
 * Proves: fail-closed when unconfigured, one InvokeModel per text, order preserved under the
 * 4-way concurrency fan-out, newline cleanup + input truncation, and a loud error when Titan
 * returns no embedding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
const clientCtor = vi.fn(() => ({ send: sendMock }));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: clientCtor,
  InvokeModelCommand: vi.fn((input: unknown) => ({ __type: 'Invoke', input })),
}));

// Never resolve real credentials (undefined = "use the default chain", which we never reach).
vi.mock('@/lib/aws/credentials', () => ({ awsCredentials: vi.fn(async () => undefined) }));

type InvokeInput = { modelId: string; body: string };

/** Shape of a Titan InvokeModel response: JSON bytes in `body`. */
function titanResponse(embedding: number[] | undefined) {
  return { body: new TextEncoder().encode(JSON.stringify({ embedding })) };
}

function parseBody(call: { input: InvokeInput }): { inputText: string; dimensions: number; normalize: boolean } {
  return JSON.parse(call.input.body);
}

const AWS_KEYS = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_ROLE_ARN', 'AWS_PROFILE', 'AWS_WEB_IDENTITY_TOKEN_FILE', 'BEDROCK_EMBED_MODEL_ID'];

function setEnv(env: Record<string, string>) {
  for (const k of AWS_KEYS) delete process.env[k];
  Object.assign(process.env, env);
}

const CONFIGURED = { AWS_REGION: 'us-east-1', AWS_ACCESS_KEY_ID: 'AKIA_TEST' };

beforeEach(() => {
  vi.resetModules(); // embeddings.ts caches its client at module scope
  sendMock.mockReset();
  clientCtor.mockClear();
});

describe('embedTexts', () => {
  it('returns [] for empty input without touching config or AWS', async () => {
    setEnv({}); // unconfigured on purpose — must still succeed for []
    const { embedTexts } = await import('../embeddings');
    await expect(embedTexts([])).resolves.toEqual([]);
    expect(clientCtor).not.toHaveBeenCalled();
  });

  it('throws (and never constructs a client) when Bedrock is not configured', async () => {
    setEnv({});
    const { embedTexts } = await import('../embeddings');
    await expect(embedTexts(['hello'])).rejects.toThrow(/not configured/i);
    expect(clientCtor).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('embeds each text via the MOCKED SDK, preserving order despite concurrency', async () => {
    setEnv(CONFIGURED);
    // Echo back an embedding derived from the input so we can verify ordering.
    sendMock.mockImplementation(async (cmd: { input: InvokeInput }) => {
      const { inputText } = parseBody(cmd);
      return titanResponse([inputText.charCodeAt(inputText.length - 1)]);
    });

    const { embedTexts } = await import('../embeddings');
    const texts = ['doc a', 'doc b', 'doc c', 'doc d', 'doc e', 'doc f'];
    const out = await embedTexts(texts);

    expect(sendMock).toHaveBeenCalledTimes(6); // Titan is one input per call
    expect(out).toEqual(texts.map((t) => [t.charCodeAt(t.length - 1)]));
    expect(clientCtor).toHaveBeenCalledWith(expect.objectContaining({ region: 'us-east-1' }));
  });

  it('replaces newlines and asks for normalized vectors at the schema dimension', async () => {
    setEnv(CONFIGURED);
    sendMock.mockResolvedValue(titanResponse([0.1]));

    const { embedTexts } = await import('../embeddings');
    await embedTexts(['line one\nline two']);

    const body = parseBody(sendMock.mock.calls[0][0]);
    expect(body.inputText).toBe('line one line two');
    expect(body.normalize).toBe(true);
    expect(body.dimensions).toBe(1024); // must match the rag_chunk vector(1024) column
  });

  it('uses the default Titan model id unless BEDROCK_EMBED_MODEL_ID overrides it', async () => {
    setEnv(CONFIGURED);
    sendMock.mockResolvedValue(titanResponse([0]));
    const { embedQuery } = await import('../embeddings');
    await embedQuery('q');
    expect((sendMock.mock.calls[0][0] as { input: InvokeInput }).input.modelId).toBe(
      'amazon.titan-embed-text-v2:0',
    );
  });

  it('truncates a single input to 8000 chars (Titan input cap)', async () => {
    setEnv(CONFIGURED);
    sendMock.mockResolvedValue(titanResponse([0]));
    const { embedTexts } = await import('../embeddings');
    await embedTexts(['x'.repeat(9000)]);
    expect(parseBody(sendMock.mock.calls[0][0]).inputText).toHaveLength(8000);
  });

  it('throws loudly when Titan returns no embedding', async () => {
    setEnv(CONFIGURED);
    sendMock.mockResolvedValue(titanResponse(undefined));
    const { embedQuery } = await import('../embeddings');
    await expect(embedQuery('hello')).rejects.toThrow(/no embedding/i);
  });
});
