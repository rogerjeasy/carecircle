/**
 * One-off diagnostic for the /admin/system "Down · unreachable" rows: runs the exact same SDK
 * calls as src/lib/admin/system-health.ts but PRINTS the real error name/status instead of
 * swallowing it. Read-only control-plane calls; never prints credentials.
 *
 *   npx tsx scripts/diagnose-aws-probes.mts
 */
import 'dotenv/config';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { SNSClient, GetTopicAttributesCommand } from '@aws-sdk/client-sns';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { SESv2Client, GetAccountCommand } from '@aws-sdk/client-sesv2';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const TOPIC = process.env.SNS_ESCALATIONS_TOPIC_ARN;
const BUCKET = process.env.S3_BUCKET;

type AwsErr = { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };

async function attempt(label: string, run: () => Promise<unknown>) {
  const started = performance.now();
  try {
    await run();
    console.log(`✅ ${label}: OK (${Math.round(performance.now() - started)}ms)`);
  } catch (err) {
    const e = err as AwsErr;
    console.log(
      `❌ ${label}: ${e.name ?? 'Error'} (HTTP ${e.$metadata?.httpStatusCode ?? '?'}) — ${e.message ?? ''}`,
    );
  }
}

console.log(`region=${REGION} topic=${TOPIC} bucket=${BUCKET}`);

await attempt('Bedrock ListFoundationModels', () =>
  new BedrockClient({ region: REGION, maxAttempts: 1 }).send(new ListFoundationModelsCommand({})),
);
await attempt('SNS GetTopicAttributes', () =>
  new SNSClient({ region: REGION, maxAttempts: 1 }).send(
    new GetTopicAttributesCommand({ TopicArn: TOPIC }),
  ),
);
// Working baselines, for comparison:
await attempt('S3 HeadBucket', () =>
  new S3Client({ region: REGION, maxAttempts: 1 }).send(new HeadBucketCommand({ Bucket: BUCKET })),
);
await attempt('SES GetAccount', () =>
  new SESv2Client({ region: REGION, maxAttempts: 1 }).send(new GetAccountCommand({})),
);
