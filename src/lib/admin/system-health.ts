/**
 * Live system-health checks for the platform console.
 *
 * Replaces the hard-coded `services` array in dashboard-data.ts with REAL signals:
 *   • API / Server Actions — measured server-side processing time of this request.
 *   • Aurora PostgreSQL    — a real `select 1` round-trip (latency + up/down) via the admin probe.
 *   • Bedrock / S3 / SES / SNS — real AWS SDK control-plane calls (cheap, mostly unbilled):
 *       S3   → HeadBucket(S3_BUCKET)
 *       SNS  → GetTopicAttributes(SNS_ESCALATIONS_TOPIC_ARN)
 *       SES  → GetAccount() (also surfaces whether sending is enabled)
 *       Bedrock → ListFoundationModels()
 *     A service with no env wiring reports "not configured" rather than faking a metric.
 *
 * Cost note: these are metadata/list operations — GetTopicAttributes, GetAccount and
 * ListFoundationModels are not billed; HeadBucket is a single S3 request (~$0.0000004). They run in
 * ONE shared monitor (see live-hub.ts), only while an admin is watching, so total volume is tiny.
 *
 * Server-only: depends on the privileged DB probe + AWS credentials. Call only behind
 * `requirePlatformAdmin()`.
 */
import 'server-only';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { SNSClient, GetTopicAttributesCommand } from '@aws-sdk/client-sns';
import { SESv2Client, GetAccountCommand } from '@aws-sdk/client-sesv2';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { pingDb, getOpenIncidentCount } from '@/db/admin-queries';
import { isPlatformDbConfigured } from '@/db/admin-db';
import { awsCredentials } from '@/lib/aws/credentials';
import type { Service, ServiceStatus, HealthMetrics, SystemHealthData } from './system-types';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const PROBE_TIMEOUT_MS = 3000;

type Probe = { status: ServiceStatus; metric: string };

const NOT_CONFIGURED: Probe = { status: 'degraded', metric: 'not configured' };

/** True when AWS is wired at all (region + a credential — static key, role/OIDC, or profile). */
function awsConfigured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      (process.env.AWS_ACCESS_KEY_ID ||
        process.env.AWS_ROLE_ARN ||
        process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
        process.env.AWS_PROFILE),
  );
}

// Lazy singleton SDK clients — one connection pool per service, reused across every probe.
// `maxAttempts: 1` keeps a down service fast (no SDK retry storm inside our timeout).
let _s3: S3Client | null = null;
let _sns: SNSClient | null = null;
let _ses: SESv2Client | null = null;
let _bedrock: BedrockClient | null = null;

const s3 = async () =>
  (_s3 ??= new S3Client({ region: REGION, maxAttempts: 1, credentials: await awsCredentials() }));
const sns = async () =>
  (_sns ??= new SNSClient({ region: REGION, maxAttempts: 1, credentials: await awsCredentials() }));
const ses = async () =>
  (_ses ??= new SESv2Client({ region: REGION, maxAttempts: 1, credentials: await awsCredentials() }));
const bedrock = async () =>
  (_bedrock ??= new BedrockClient({ region: REGION, maxAttempts: 1, credentials: await awsCredentials() }));

/**
 * An access-denied response is proof the SERVICE is up — it answered — but our IAM policy is
 * missing the probe's action (see infra/iam.tf "HealthProbe" statements). Surfacing that as
 * "degraded · check IAM" stops a permissions gap from masquerading as an AWS outage.
 */
function isAccessDenied(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
  return name === 'AccessDeniedException' || name === 'AuthorizationErrorException' || status === 403;
}

/**
 * Run an AWS SDK probe under a hard timeout. Any successful response = operational (latency shown);
 * access denied = degraded (the service answered; our IAM policy lacks the probe action); any other
 * error or timeout = down. `run` may downgrade an otherwise-ok result (e.g. SES paused).
 */
async function probe(
  configured: boolean,
  run: (signal: AbortSignal) => Promise<Probe | void>,
): Promise<Probe> {
  if (!configured) return NOT_CONFIGURED;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const started = performance.now();
  try {
    const override = await run(controller.signal);
    return override ?? { status: 'operational', metric: `${Math.round(performance.now() - started)}ms` };
  } catch (err) {
    if (isAccessDenied(err)) return { status: 'degraded', metric: 'check IAM' };
    return { status: 'down', metric: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** Run the four AWS probes together so total wait ≈ the slowest single check. */
async function checkAwsServices() {
  const configured = awsConfigured();
  const bucket = process.env.S3_BUCKET;
  const topicArn = process.env.SNS_ESCALATIONS_TOPIC_ARN;

  const [bedrockP, s3P, sesP, snsP] = await Promise.all([
    probe(configured, async (abortSignal) => {
      await (await bedrock()).send(new ListFoundationModelsCommand({}), { abortSignal });
    }),
    probe(configured && Boolean(bucket), async (abortSignal) => {
      await (await s3()).send(new HeadBucketCommand({ Bucket: bucket! }), { abortSignal });
    }),
    probe(configured, async (abortSignal) => {
      const acct = await (await ses()).send(new GetAccountCommand({}), { abortSignal });
      if (acct.SendingEnabled === false) return { status: 'degraded', metric: 'sending paused' };
    }),
    probe(configured && Boolean(topicArn), async (abortSignal) => {
      await (await sns()).send(new GetTopicAttributesCommand({ TopicArn: topicArn! }), { abortSignal });
    }),
  ]);

  return { bedrock: bedrockP, s3: s3P, ses: sesP, sns: snsP };
}

/**
 * Build the full live status snapshot: every service's status + the measured operational metrics.
 * Never throws on a single failing dependency — a failure is rendered as a down/degraded row.
 */
export async function getSystemHealth(): Promise<SystemHealthData> {
  let serverWorkMs = 0;
  let probeResult = { ok: false, latencyMs: 0 };
  let openIncidents = 0;

  // DB-bound work, timed on its own → the honest "API / Server Actions" latency (our server actions
  // are DB-bound). AWS probes run in parallel but are measured separately so their external wait
  // doesn't inflate the API number.
  const dbConfigured = isPlatformDbConfigured();
  const dbWork = (async () => {
    if (!dbConfigured) return;
    const start = performance.now();
    [probeResult, openIncidents] = await Promise.all([pingDb(), getOpenIncidentCount()]);
    serverWorkMs = Math.round(performance.now() - start);
  })();

  const [, aws] = await Promise.all([dbWork, checkAwsServices()]);

  const services: Service[] = [
    {
      name: 'API / Server Actions',
      detail: `Next.js · ${REGION}`,
      status: 'operational',
      metric: `${serverWorkMs}ms`,
    },
    {
      name: 'Aurora PostgreSQL',
      detail: `Serverless v2 · ${REGION}`,
      status: dbConfigured ? (probeResult.ok ? 'operational' : 'down') : 'degraded',
      metric: dbConfigured
        ? probeResult.ok
          ? `${probeResult.latencyMs}ms`
          : 'unreachable'
        : 'not configured',
    },
    { name: 'Amazon Bedrock (Claude)', detail: 'Daily Digest · Ask', ...aws.bedrock },
    { name: 'Amazon S3', detail: 'documents & photos', ...aws.s3 },
    { name: 'Amazon SES', detail: 'transactional email', ...aws.ses },
    { name: 'Amazon SNS', detail: 'push & escalations', ...aws.sns },
  ];

  const servicesHealthy = services.filter((s) => s.status === 'operational').length;

  const metrics: HealthMetrics = {
    apiLatencyMs: serverWorkMs,
    dbLatencyMs: probeResult.latencyMs,
    servicesHealthy,
    servicesTotal: services.length,
    openIncidents,
  };

  return { services, metrics, checkedAt: new Date().toISOString() };
}
