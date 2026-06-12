/**
 * High-severity incident escalation orchestration — the SNS/email/SMS senders are MOCKED
 * (no AWS). Verifies the fan-out rules: one SNS publish with filterable attributes, one email
 * per contact WITH an address, one SMS per contact WITH a phone, and the hard guarantee that
 * this function never throws (the incident is already committed when it runs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEscalation = vi.fn();
const sendIncidentEscalationEmail = vi.fn();
const sendSms = vi.fn();
vi.mock('@/lib/email', () => ({
  sendEscalation: (...a: unknown[]) => sendEscalation(...a),
  sendIncidentEscalationEmail: (...a: unknown[]) => sendIncidentEscalationEmail(...a),
  sendSms: (...a: unknown[]) => sendSms(...a),
}));

vi.mock('@/lib/url', () => ({ getAppOrigin: vi.fn(async () => 'https://app.test') }));

const serverLog = vi.fn();
vi.mock('@/lib/log', () => ({ serverLog: (...a: unknown[]) => serverLog(...a) }));

import { escalateHighSeverityIncident, type EscalateParams } from '../notify';

function params(overrides: Partial<EscalateParams> = {}): EscalateParams {
  return {
    incidentId: 'inc-1',
    circleId: 'circle-1',
    type: 'fall',
    severity: 'high',
    description: 'Found on the kitchen floor, conscious.',
    reporterName: 'Maria',
    recipientFirstName: 'Rosa',
    occurredAt: new Date('2026-06-09T07:40:00Z'),
    contacts: [
      { name: 'Ana', email: 'ana@example.com', phone: '+15551230001' },
      { name: 'Ben', email: null, phone: '+15551230002' }, // phone only
      { name: 'Cy', email: 'cy@example.com', phone: null }, // email only
      { name: 'Didi', email: null, phone: null }, // unreachable
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendEscalation.mockResolvedValue(true);
  sendIncidentEscalationEmail.mockResolvedValue(undefined);
  sendSms.mockResolvedValue(true);
});

describe('escalateHighSeverityIncident', () => {
  it('publishes ONE SNS escalation with filterable attributes and the incident link', async () => {
    await escalateHighSeverityIncident(params());

    expect(sendEscalation).toHaveBeenCalledTimes(1);
    const arg = sendEscalation.mock.calls[0][0] as { subject: string; message: string; attributes: Record<string, string> };
    expect(arg.subject).toBe('Urgent: Fall reported for Rosa');
    expect(arg.message).toContain('Maria reported fall for Rosa');
    expect(arg.message).toContain('High severity');
    expect(arg.message).toContain('Found on the kitchen floor, conscious.');
    expect(arg.message).toContain('https://app.test/incidents/inc-1');
    expect(arg.attributes).toEqual({
      circleId: 'circle-1',
      severity: 'high',
      incidentId: 'inc-1',
      type: 'fall',
    });
  });

  it('emails exactly the contacts that have an address, and texts exactly those with a phone', async () => {
    await escalateHighSeverityIncident(params());

    const emailedTo = sendIncidentEscalationEmail.mock.calls.map(
      (c) => (c[0] as { to: string }).to,
    );
    expect(emailedTo.sort()).toEqual(['ana@example.com', 'cy@example.com']);

    const textedTo = sendSms.mock.calls.map((c) => (c[0] as { phone: string }).phone);
    expect(textedTo.sort()).toEqual(['+15551230001', '+15551230002']);
  });

  it('falls back to "your loved one" when the recipient has no first name', async () => {
    await escalateHighSeverityIncident(params({ recipientFirstName: null }));
    const arg = sendEscalation.mock.calls[0][0] as { subject: string };
    expect(arg.subject).toBe('Urgent: Fall reported for your loved one');
  });

  it('keeps going when individual sends fail, and logs honest counts', async () => {
    sendIncidentEscalationEmail
      .mockRejectedValueOnce(new Error('bounce')) // ana fails
      .mockResolvedValueOnce(undefined); // cy succeeds
    sendSms.mockResolvedValueOnce(false).mockResolvedValueOnce(true); // one bad number

    await expect(escalateHighSeverityIncident(params())).resolves.toBeUndefined();

    expect(serverLog).toHaveBeenCalledWith(
      'incidents',
      'escalate',
      'success',
      expect.objectContaining({
        incidentId: 'inc-1',
        sns: true,
        emailed: 1,
        emailRecipients: 2,
        texted: 1,
        smsRecipients: 2,
      }),
    );
  });

  it('NEVER throws, even if the whole pipeline blows up — logs a failure instead', async () => {
    sendEscalation.mockRejectedValue(new Error('sns exploded'));

    await expect(escalateHighSeverityIncident(params())).resolves.toBeUndefined();

    expect(serverLog).toHaveBeenCalledWith(
      'incidents',
      'escalate',
      'failure',
      expect.objectContaining({ incidentId: 'inc-1' }),
    );
  });

  it('never leaks the description or contact details into serverLog meta (PII hygiene)', async () => {
    await escalateHighSeverityIncident(params());
    for (const call of serverLog.mock.calls) {
      const meta = JSON.stringify(call[3] ?? {});
      expect(meta).not.toContain('kitchen floor');
      expect(meta).not.toContain('ana@example.com');
      expect(meta).not.toContain('+1555');
    }
  });
});
