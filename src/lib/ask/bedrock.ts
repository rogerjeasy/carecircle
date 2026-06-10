import 'server-only';

/**
 * Claude on Amazon Bedrock — the answer-generation step for Ask.
 *
 * We use Bedrock's provider-agnostic **Converse API** (`@aws-sdk/client-bedrock-runtime`). The model
 * is configured via `BEDROCK_MODEL_ID` (an inference-profile id like
 * `us.anthropic.claude-opus-4-...`) because Bedrock ids are account/region-specific — we never
 * hardcode one. Credentials come from the standard AWS chain, same as S3/SES.
 *
 * Note: we send only `maxTokens` in inferenceConfig (no temperature/top_p) — newer Claude models
 * reject sampling params, and grounded Q&A wants the model's default deterministic-ish behaviour.
 */
import { serverLog } from '@/lib/log';

/** True when a region, AWS credentials, and a model id are all present. */
export function isBedrockConfigured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.BEDROCK_MODEL_ID &&
      (process.env.AWS_ACCESS_KEY_ID ||
        process.env.AWS_ROLE_ARN ||
        process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
        process.env.AWS_PROFILE),
  );
}

let _client: import('@aws-sdk/client-bedrock-runtime').BedrockRuntimeClient | null = null;
async function client() {
  if (!_client) {
    const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
    const { awsCredentials } = await import('@/lib/aws/credentials');
    _client = new BedrockRuntimeClient({ region: process.env.AWS_REGION, credentials: await awsCredentials() });
  }
  return _client;
}

/** Ask Claude on Bedrock with a system prompt + a single user turn. Returns the text reply. */
export async function askClaude(opts: { system: string; user: string; maxTokens?: number }): Promise<string> {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!isBedrockConfigured() || !modelId) {
    throw new Error('Bedrock is not configured (set AWS_REGION, AWS credentials, and BEDROCK_MODEL_ID).');
  }
  const { ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const c = await client();
  const res = await c.send(
    new ConverseCommand({
      modelId,
      system: [{ text: opts.system }],
      messages: [{ role: 'user', content: [{ text: opts.user }] }],
      inferenceConfig: { maxTokens: opts.maxTokens ?? 1024 },
    }),
  );
  const text = res.output?.message?.content?.map((b) => ('text' in b ? b.text : '')).join('').trim();
  if (!text) {
    serverLog('ask', 'askClaude', 'failure', { reason: 'empty_response' });
    throw new Error('The assistant returned an empty response.');
  }
  return text;
}
