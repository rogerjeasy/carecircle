/**
 * Bedrock client tests — proves the AI layer is fully MOCKED in tests (no real AWS calls) and that
 * `isBedrockConfigured()` is fail-closed. We mock `@aws-sdk/client-bedrock-runtime` so neither a
 * client is constructed against AWS nor a network request is made; `askClaude` is driven entirely by
 * the fake Converse response.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock the AWS SDK module that bedrock.ts dynamically imports ---
const sendMock = vi.fn();
const clientCtor = vi.fn(() => ({ send: sendMock }));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: clientCtor,
  // The command classes just capture their input so we can assert on it.
  ConverseCommand: vi.fn((input: unknown) => ({ __type: 'Converse', input })),
  InvokeModelCommand: vi.fn((input: unknown) => ({ __type: 'Invoke', input })),
}));

// Mock serverLog so a logging path never touches anything real.
vi.mock('@/lib/log', () => ({ serverLog: vi.fn() }));

const FULL_ENV = {
  AWS_REGION: 'us-east-1',
  BEDROCK_MODEL_ID: 'us.anthropic.claude-test',
  AWS_ACCESS_KEY_ID: 'AKIA_TEST',
};

function setEnv(env: Record<string, string | undefined>) {
  for (const k of ['AWS_REGION', 'BEDROCK_MODEL_ID', 'AWS_ACCESS_KEY_ID', 'AWS_ROLE_ARN', 'AWS_PROFILE', 'AWS_WEB_IDENTITY_TOKEN_FILE']) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
}

beforeEach(() => {
  vi.resetModules();
  sendMock.mockReset();
  clientCtor.mockClear();
});

describe('isBedrockConfigured', () => {
  it('is false when region / model / credentials are missing (fail-closed)', async () => {
    setEnv({});
    const { isBedrockConfigured } = await import('../bedrock');
    expect(isBedrockConfigured()).toBe(false);

    setEnv({ AWS_REGION: 'us-east-1' }); // region only
    const m2 = await import('../bedrock');
    expect(m2.isBedrockConfigured()).toBe(false);

    setEnv({ AWS_REGION: 'us-east-1', BEDROCK_MODEL_ID: 'm' }); // no credentials
    const m3 = await import('../bedrock');
    expect(m3.isBedrockConfigured()).toBe(false);
  });

  it('is true only with region + model + a credential source', async () => {
    setEnv(FULL_ENV);
    const { isBedrockConfigured } = await import('../bedrock');
    expect(isBedrockConfigured()).toBe(true);
  });
});

describe('askClaude', () => {
  it('throws (does not call AWS) when Bedrock is not configured', async () => {
    setEnv({});
    const { askClaude } = await import('../bedrock');
    await expect(askClaude({ system: 's', user: 'u' })).rejects.toThrow(/not configured/i);
    expect(clientCtor).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns the model text via the MOCKED Converse call — no real AWS', async () => {
    setEnv(FULL_ENV);
    sendMock.mockResolvedValue({
      output: { message: { content: [{ text: 'Hello ' }, { text: 'from Claude.' }] } },
    });

    const { askClaude } = await import('../bedrock');
    const out = await askClaude({ system: 'be helpful', user: 'hi', maxTokens: 256 });

    expect(out).toBe('Hello from Claude.');
    // Proves we went through the (mocked) SDK rather than the network.
    expect(clientCtor).toHaveBeenCalledWith({ region: 'us-east-1' });
    expect(sendMock).toHaveBeenCalledTimes(1);

    const command = sendMock.mock.calls[0][0] as { __type: string; input: Record<string, unknown> };
    expect(command.__type).toBe('Converse');
    expect(command.input.modelId).toBe(FULL_ENV.BEDROCK_MODEL_ID);
    expect(command.input.inferenceConfig).toEqual({ maxTokens: 256 });
  });

  it('throws on an empty model response', async () => {
    setEnv(FULL_ENV);
    sendMock.mockResolvedValue({ output: { message: { content: [{ text: '' }] } } });
    const { askClaude } = await import('../bedrock');
    await expect(askClaude({ system: 's', user: 'u' })).rejects.toThrow(/empty/i);
  });
});
