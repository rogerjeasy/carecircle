import 'server-only';

/**
 * AWS credentials — Vercel OIDC federation first, the SDK default chain otherwise.
 *
 * On Vercel (with the project's OIDC issuer trusted by an AWS IAM role), each function invocation
 * carries a short-lived `VERCEL_OIDC_TOKEN`. With `AWS_ROLE_ARN` set, we exchange it via STS
 * `AssumeRoleWithWebIdentity` — so production holds NO long-lived AWS keys at all. This is the
 * "no stored keys" posture the architecture diagram promises.
 *
 * Locally (or anywhere without an OIDC token) we return `undefined`, which lets every client fall
 * back to the standard chain: `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars, a shared
 * profile, or an instance role. All five AWS clients (Bedrock generate + embed, SES, SNS, S3)
 * resolve through this one function, so the swap to OIDC is a single env change, not a code one.
 *
 * Setup (see SETUP.md §"Vercel OIDC → AWS"):
 *   1. AWS IAM → create an OIDC identity provider for the Vercel team issuer.
 *   2. Create a role trusting it (condition: sub = your project) with least-privilege policies.
 *   3. Set `AWS_ROLE_ARN` in Vercel env — and remove the static keys.
 */
import type { AwsCredentialIdentityProvider } from '@smithy/types';

let _provider: AwsCredentialIdentityProvider | null = null;

/** True when this invocation can mint AWS credentials from the Vercel OIDC token. */
export function hasVercelOidc(): boolean {
  return Boolean(process.env.VERCEL_OIDC_TOKEN && process.env.AWS_ROLE_ARN);
}

/**
 * The credentials option for an AWS SDK client: a Vercel-OIDC role provider when available,
 * or `undefined` to use the SDK's default chain.
 */
export async function awsCredentials(): Promise<AwsCredentialIdentityProvider | undefined> {
  if (!hasVercelOidc()) return undefined;
  if (!_provider) {
    const { awsCredentialsProvider } = await import('@vercel/functions/oidc');
    _provider = awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      roleSessionName: 'carecircle-vercel',
    });
  }
  return _provider;
}
