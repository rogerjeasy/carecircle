/**
 * Email + SNS escalation tests — SES, SNS, nodemailer and Resend are all MOCKED (no real AWS,
 * no SMTP, no network). Covers provider selection, the console fallback, SES delivery, and the
 * never-throws contract of sendSms / sendEscalation (an alerting hiccup must not roll back the
 * incident that triggered it).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sesSendMock = vi.fn();
const sesCtor = vi.fn(() => ({ send: sesSendMock }));
vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: sesCtor,
  SendEmailCommand: vi.fn((input: unknown) => ({ __type: 'SendEmail', input })),
}));

const snsSendMock = vi.fn();
const snsCtor = vi.fn(() => ({ send: snsSendMock }));
vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: snsCtor,
  PublishCommand: vi.fn((input: unknown) => ({ __type: 'Publish', input })),
}));

// These two should never even be constructed in this suite, but stub them so a wrong
// provider pick fails the assertion rather than hitting the network.
const smtpSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: smtpSendMail })) },
}));
const resendSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send: resendSend } })),
}));

vi.mock('@/lib/aws/credentials', () => ({ awsCredentials: vi.fn(async () => undefined) }));
vi.mock('@/lib/log', () => ({ serverLog: vi.fn(), maskEmail: vi.fn(() => '***@masked') }));

const ENV_KEYS = [
  'EMAIL_PROVIDER', 'EMAIL_FROM', 'RESEND_API_KEY',
  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PORT',
  'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_ROLE_ARN', 'AWS_PROFILE', 'AWS_WEB_IDENTITY_TOKEN_FILE',
  'SNS_ESCALATIONS_TOPIC_ARN',
];

const AWS_ENV = { AWS_REGION: 'us-east-1', AWS_ACCESS_KEY_ID: 'AKIA_TEST' };

/** Import a fresh copy AFTER env is set (EMAIL_FROM is read at module load). */
async function loadEmail(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  return import('../email');
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sesSendMock.mockReset();
  sesCtor.mockClear();
  snsSendMock.mockReset();
  snsCtor.mockClear();
  smtpSendMail.mockReset();
  resendSend.mockReset();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('email delivery', () => {
  it('falls back to the console with nothing configured — no SDK, no network', async () => {
    const { sendPasswordResetEmail } = await loadEmail({});
    await sendPasswordResetEmail('user@example.com', 'https://app.test/reset-password?token=t');

    expect(warnSpy).toHaveBeenCalled();
    expect(sesCtor).not.toHaveBeenCalled();
    expect(smtpSendMail).not.toHaveBeenCalled();
    expect(resendSend).not.toHaveBeenCalled();
  });

  it('delivers through the MOCKED SES client when EMAIL_PROVIDER=ses', async () => {
    sesSendMock.mockResolvedValue({});
    const { sendPasswordResetEmail } = await loadEmail({
      ...AWS_ENV,
      EMAIL_PROVIDER: 'ses',
      EMAIL_FROM: 'Kintwadi <no-reply@kintwadi.example>',
    });

    await sendPasswordResetEmail('user@example.com', 'https://app.test/reset');

    expect(sesCtor).toHaveBeenCalledWith(expect.objectContaining({ region: 'us-east-1' }));
    expect(sesSendMock).toHaveBeenCalledTimes(1);
    const cmd = sesSendMock.mock.calls[0][0] as { __type: string; input: Record<string, unknown> };
    expect(cmd.__type).toBe('SendEmail');
    expect(cmd.input).toMatchObject({
      FromEmailAddress: 'Kintwadi <no-reply@kintwadi.example>',
      Destination: { ToAddresses: ['user@example.com'] },
    });
    const content = cmd.input.Content as { Simple: { Subject: { Data: string }; Body: { Html: { Data: string }; Text: { Data: string } } } };
    expect(content.Simple.Subject.Data).toBeTruthy();
    expect(content.Simple.Body.Text.Data).toContain('https://app.test/reset');
    expect(content.Simple.Body.Html.Data).toContain('https://app.test/reset');
  });

  it('auto-selects SES when AWS creds + a verified (non resend.dev) sender are present', async () => {
    sesSendMock.mockResolvedValue({});
    const { sendPasswordResetEmail } = await loadEmail({
      ...AWS_ENV,
      EMAIL_FROM: 'Kintwadi <no-reply@kintwadi.example>',
    });
    await sendPasswordResetEmail('user@example.com', 'https://app.test/reset');
    expect(sesSendMock).toHaveBeenCalledTimes(1);
  });

  it('never routes a resend.dev sandbox sender to SES, even with AWS creds present', async () => {
    const { sendPasswordResetEmail } = await loadEmail({
      ...AWS_ENV,
      EMAIL_FROM: 'Kintwadi <onboarding@resend.dev>',
    });
    await sendPasswordResetEmail('user@example.com', 'https://app.test/reset');
    expect(sesCtor).not.toHaveBeenCalled(); // falls through to console (no Resend key set)
    expect(warnSpy).toHaveBeenCalled();
  });

  it('skips an undeliverable .demo recipient WITHOUT sending — returns { delivered: false }', async () => {
    sesSendMock.mockResolvedValue({});
    const { sendNotificationEmail } = await loadEmail({
      ...AWS_ENV,
      EMAIL_PROVIDER: 'ses',
      EMAIL_FROM: 'Kintwadi <no-reply@kintwadi.example>',
    });

    const res = await sendNotificationEmail({
      to: 'maria@kintwadi.demo',
      title: 'New task',
      body: 'Pick up the prescription',
      url: 'https://app.test/tasks',
    });

    expect(res).toEqual({ delivered: false, reason: 'demo_address' });
    // The whole point: no provider was ever touched for a demo address.
    expect(sesSendMock).not.toHaveBeenCalled();
    expect(smtpSendMail).not.toHaveBeenCalled();
    expect(resendSend).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled(); // not even the console fallback
  });

  it('still delivers normally to a real address (the gate only blocks demo/invalid)', async () => {
    sesSendMock.mockResolvedValue({});
    const { sendNotificationEmail } = await loadEmail({
      ...AWS_ENV,
      EMAIL_PROVIDER: 'ses',
      EMAIL_FROM: 'Kintwadi <no-reply@kintwadi.example>',
    });

    const res = await sendNotificationEmail({
      to: 'real.person@gmail.com',
      title: 'New task',
      body: 'Pick up the prescription',
      url: 'https://app.test/tasks',
    });

    expect(res).toEqual({ delivered: true, provider: 'ses' });
    expect(sesSendMock).toHaveBeenCalledTimes(1);
  });

  it('propagates a SES failure to the caller (callers decide whether a send is fatal)', async () => {
    sesSendMock.mockRejectedValue(Object.assign(new Error('rejected'), { name: 'MessageRejected' }));
    const { sendPasswordResetEmail } = await loadEmail({
      ...AWS_ENV,
      EMAIL_PROVIDER: 'ses',
      EMAIL_FROM: 'Kintwadi <no-reply@kintwadi.example>',
    });
    await expect(sendPasswordResetEmail('user@example.com', 'https://x')).rejects.toThrow('rejected');
  });
});

describe('sendSms', () => {
  it('rejects a non-E.164 phone without touching AWS, returning false', async () => {
    const { sendSms } = await loadEmail(AWS_ENV);
    expect(await sendSms({ phone: '0612345678', message: 'hi' })).toBe(false); // no leading +
    expect(await sendSms({ phone: '+12', message: 'hi' })).toBe(false); // too short
    expect(await sendSms({ phone: '', message: 'hi' })).toBe(false);
    expect(snsCtor).not.toHaveBeenCalled();
  });

  it('returns false (console fallback) when AWS is not configured', async () => {
    const { sendSms } = await loadEmail({});
    expect(await sendSms({ phone: '+15551234567', message: 'hi' })).toBe(false);
    expect(snsCtor).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('publishes a Transactional SMS via the MOCKED SNS client, normalizing the number', async () => {
    snsSendMock.mockResolvedValue({});
    const { sendSms } = await loadEmail(AWS_ENV);

    const ok = await sendSms({ phone: '+1 (555) 123-4567', message: '  urgent\n\nfall reported  ' });

    expect(ok).toBe(true);
    const cmd = snsSendMock.mock.calls[0][0] as { __type: string; input: Record<string, unknown> };
    expect(cmd.__type).toBe('Publish');
    expect(cmd.input.PhoneNumber).toBe('+15551234567');
    expect(cmd.input.Message).toBe('urgent fall reported'); // whitespace collapsed
    expect(cmd.input.MessageAttributes).toEqual({
      'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
    });
  });

  it('caps the message at 600 chars to bound SMS segments', async () => {
    snsSendMock.mockResolvedValue({});
    const { sendSms } = await loadEmail(AWS_ENV);
    await sendSms({ phone: '+15551234567', message: 'x'.repeat(1000) });
    expect((snsSendMock.mock.calls[0][0] as { input: { Message: string } }).input.Message).toHaveLength(600);
  });

  it('NEVER throws — an SNS failure returns false', async () => {
    snsSendMock.mockRejectedValue(Object.assign(new Error('down'), { name: 'ServiceUnavailable' }));
    const { sendSms } = await loadEmail(AWS_ENV);
    await expect(sendSms({ phone: '+15551234567', message: 'hi' })).resolves.toBe(false);
  });
});

describe('sendEscalation', () => {
  const TOPIC = 'arn:aws:sns:us-east-1:123456789012:escalations';

  it('returns false (console fallback) when the topic or AWS creds are missing', async () => {
    const noTopic = await loadEmail(AWS_ENV);
    expect(await noTopic.sendEscalation({ subject: 's', message: 'm' })).toBe(false);

    const noCreds = await loadEmail({ SNS_ESCALATIONS_TOPIC_ARN: TOPIC });
    expect(await noCreds.sendEscalation({ subject: 's', message: 'm' })).toBe(false);
    expect(snsCtor).not.toHaveBeenCalled();
  });

  it('publishes to the topic with String message attributes for filtering', async () => {
    snsSendMock.mockResolvedValue({});
    const { sendEscalation } = await loadEmail({ ...AWS_ENV, SNS_ESCALATIONS_TOPIC_ARN: TOPIC });

    const ok = await sendEscalation({
      subject: 'Urgent: fall reported',
      message: 'Maria reported a fall.',
      attributes: { circleId: 'c1', severity: 'high' },
    });

    expect(ok).toBe(true);
    const cmd = snsSendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(cmd.input).toMatchObject({
      TopicArn: TOPIC,
      Message: 'Maria reported a fall.',
      MessageAttributes: {
        circleId: { DataType: 'String', StringValue: 'c1' },
        severity: { DataType: 'String', StringValue: 'high' },
      },
    });
  });

  it('keeps the SNS Subject legal: newlines collapsed, capped at 100 chars', async () => {
    snsSendMock.mockResolvedValue({});
    const { sendEscalation } = await loadEmail({ ...AWS_ENV, SNS_ESCALATIONS_TOPIC_ARN: TOPIC });
    await sendEscalation({ subject: `urgent\nalert ${'x'.repeat(200)}`, message: 'm' });
    const subject = (snsSendMock.mock.calls[0][0] as { input: { Subject: string } }).input.Subject;
    expect(subject).toHaveLength(100);
    expect(subject).not.toMatch(/\n/);
  });

  it('NEVER throws — a publish failure returns false', async () => {
    snsSendMock.mockRejectedValue(new Error('publish failed'));
    const { sendEscalation } = await loadEmail({ ...AWS_ENV, SNS_ESCALATIONS_TOPIC_ARN: TOPIC });
    await expect(sendEscalation({ subject: 's', message: 'm' })).resolves.toBe(false);
  });
});
