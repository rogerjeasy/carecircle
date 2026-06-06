/**
 * Transactional email + urgent escalation alerts — the AWS-native notification layer.
 *
 * Email goes through whichever provider `resolveProvider()` selects:
 *   - `ses`     — Amazon SES (the architecture's choice; @aws-sdk/client-sesv2).
 *   - `smtp`    — any SMTP server via nodemailer. Set it to Gmail to email ANYONE for free with
 *                 no domain + no production approval (just a Google App Password). See .env.example.
 *   - `resend`  — Resend (kept as an alternative / fast local setup).
 *   - `console` — logs the message to the server console so flows work end-to-end with zero setup.
 * Set `EMAIL_PROVIDER` to force one; otherwise we auto-pick: SMTP when SMTP creds are present, else
 * SES when AWS creds + a real (non resend.dev) `EMAIL_FROM` are present, else Resend when its key is
 * set, else console. Callers (password reset, invitations) never change regardless of provider.
 *
 * Escalations (a logged fall, an ER visit) fan out through Amazon SNS — see `sendEscalation()`.
 */
import 'server-only';
import {
  passwordResetEmail,
  invitationEmail,
  welcomeEmail,
  joinedCircleEmail,
} from '@/lib/email-templates';
import { serverLog, maskEmail } from '@/lib/log';

const FROM = process.env.EMAIL_FROM ?? 'CareCircle <onboarding@resend.dev>';

type Email = { to: string; subject: string; html: string; text: string };
type EmailProvider = 'ses' | 'smtp' | 'resend' | 'console';

/** True when the SDK's default credential chain has something to work with (key, role, or profile). */
function hasAwsCredentials(): boolean {
  return (
    Boolean(process.env.AWS_REGION) &&
    Boolean(
      process.env.AWS_ACCESS_KEY_ID ||
        process.env.AWS_ROLE_ARN ||
        process.env.AWS_WEB_IDENTITY_TOKEN_FILE ||
        process.env.AWS_PROFILE,
    )
  );
}

/** True when an SMTP server is fully configured (host + credentials). */
function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Decide which email backend to use for this send. Explicit env wins; otherwise auto-detect. */
function resolveProvider(): EmailProvider {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === 'ses' || explicit === 'smtp' || explicit === 'resend' || explicit === 'console') {
    return explicit;
  }

  // Auto: SMTP first (most explicit — the user set SMTP_* on purpose), then SES, then Resend.
  // A `@resend.dev` sender is Resend's sandbox address, never a verified SES identity, so we
  // don't mistakenly route those to SES.
  const fromIsResendSandbox = /@resend\.dev>?\s*$/i.test(FROM);
  if (hasSmtpConfig()) return 'smtp';
  if (hasAwsCredentials() && process.env.EMAIL_FROM && !fromIsResendSandbox) return 'ses';
  if (process.env.RESEND_API_KEY) return 'resend';
  return 'console';
}

let _ses: import('@aws-sdk/client-sesv2').SESv2Client | null = null;
async function sesClient() {
  if (!_ses) {
    const { SESv2Client } = await import('@aws-sdk/client-sesv2');
    _ses = new SESv2Client({ region: process.env.AWS_REGION });
  }
  return _ses;
}

async function deliverViaSes(email: Email): Promise<void> {
  const { SendEmailCommand } = await import('@aws-sdk/client-sesv2');
  const client = await sesClient();
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [email.to] },
      Content: {
        Simple: {
          Subject: { Data: email.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: email.html, Charset: 'UTF-8' },
            Text: { Data: email.text, Charset: 'UTF-8' },
          },
        },
      },
    }),
  );
}

let _smtp: import('nodemailer').Transporter | null = null;
async function smtpTransport() {
  if (!_smtp) {
    const mod = await import('nodemailer');
    const nodemailer = mod.default ?? mod;
    const port = Number(process.env.SMTP_PORT ?? 465);
    _smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 = implicit TLS; 587/others = STARTTLS upgrade.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return _smtp;
}

async function deliverViaSmtp(email: Email): Promise<void> {
  if (!hasSmtpConfig()) {
    throw new Error('SMTP selected but SMTP_HOST / SMTP_USER / SMTP_PASS are not all set');
  }
  const transport = await smtpTransport();
  await transport.sendMail({
    from: FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

async function deliverViaResend(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Resend selected but RESEND_API_KEY is not set');
  // Imported lazily so the module loads even if `resend` isn't installed yet.
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

async function deliver(email: Email): Promise<void> {
  const provider = resolveProvider();
  try {
    if (provider === 'ses') await deliverViaSes(email);
    else if (provider === 'smtp') await deliverViaSmtp(email);
    else if (provider === 'resend') await deliverViaResend(email);
    else {
      // console fallback: surface enough to continue the flow by hand in local dev.
      console.warn(
        `\n[email] no provider configured (EMAIL_PROVIDER=console) — not actually sending.\n` +
          `  to:      ${email.to}\n  subject: ${email.subject}\n  text:\n${email.text}\n`,
      );
    }
    // Recipient is masked to its domain — never log the full address (PII).
    serverLog('email', 'deliver', 'success', { provider, to: maskEmail(email.to) });
  } catch (err) {
    serverLog('email', 'deliver', 'failure', {
      provider,
      to: maskEmail(email.to),
      reason: (err as Error)?.name ?? 'error',
    });
    throw err; // callers decide whether a send failure is fatal (it usually isn't).
  }
}

/** Send the "reset your password" email containing the one-time link. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { subject, html, text } = passwordResetEmail({ resetUrl });
  await deliver({ to, subject, html, text });
}

/** Invite a new member into a care circle. `inviteUrl` is the /invite/<token> capability link. */
export async function sendInvitationEmail(params: {
  to: string;
  inviteUrl: string;
  inviterName: string;
  recipientName: string;
  role: string;
  personalNote?: string;
}): Promise<void> {
  const { to, ...rest } = params;
  const { subject, html, text } = invitationEmail(rest);
  await deliver({ to, subject, html, text });
}

/** Welcome the circle owner once onboarding completes. Optional — call after a successful setup. */
export async function sendWelcomeEmail(params: {
  to: string;
  recipientName: string;
  dashboardUrl: string;
}): Promise<void> {
  const { to, recipientName, dashboardUrl } = params;
  const { subject, html, text } = welcomeEmail({ recipientName, dashboardUrl });
  await deliver({ to, subject, html, text });
}

/** Welcome a new member the first time they accept an invitation and join a circle. */
export async function sendJoinedCircleEmail(params: {
  to: string;
  recipientName: string;
  circleName: string;
  role: string;
  dashboardUrl: string;
}): Promise<void> {
  const { to, ...rest } = params;
  const { subject, html, text } = joinedCircleEmail(rest);
  await deliver({ to, subject, html, text });
}

// ============================================================================
// Urgent escalation alerts — Amazon SNS (the diagram's "push & urgent escalation")
// ============================================================================

let _sns: import('@aws-sdk/client-sns').SNSClient | null = null;
async function snsClient() {
  if (!_sns) {
    const { SNSClient } = await import('@aws-sdk/client-sns');
    _sns = new SNSClient({ region: process.env.AWS_REGION });
  }
  return _sns;
}

/**
 * Fan out an urgent alert (a logged fall, ER visit, missed critical med…) to the escalation
 * topic so every subscribed coordinator is notified at once. Best-effort and NEVER throws — an
 * alerting hiccup must not roll back the incident write that triggered it. Falls back to the
 * console when `SNS_ESCALATIONS_TOPIC_ARN` isn't configured, so the flow still works in dev.
 *
 * `attributes` become SNS message attributes (e.g. `{ circleId, severity }`) for topic filtering.
 * Returns true if SNS accepted the publish, false otherwise.
 */
export async function sendEscalation(params: {
  subject: string;
  message: string;
  attributes?: Record<string, string>;
}): Promise<boolean> {
  const topicArn = process.env.SNS_ESCALATIONS_TOPIC_ARN;
  const { subject, message, attributes } = params;

  if (!topicArn || !hasAwsCredentials()) {
    console.warn(
      `\n[escalation] SNS not configured — not actually sending.\n` +
        `  subject: ${subject}\n  message: ${message}\n`,
    );
    serverLog('escalation', 'publish', 'failure', { reason: 'not_configured' });
    return false;
  }

  try {
    const { PublishCommand } = await import('@aws-sdk/client-sns');
    const client = await snsClient();
    await client.send(
      new PublishCommand({
        TopicArn: topicArn,
        // SNS truncates Subject at 100 chars and disallows newlines — keep it terse.
        Subject: subject.replace(/\s+/g, ' ').slice(0, 100),
        Message: message,
        MessageAttributes: attributes
          ? Object.fromEntries(
              Object.entries(attributes).map(([k, v]) => [k, { DataType: 'String', StringValue: v }]),
            )
          : undefined,
      }),
    );
    serverLog('escalation', 'publish', 'success', attributes);
    return true;
  } catch (err) {
    serverLog('escalation', 'publish', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return false;
  }
}
