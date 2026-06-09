import 'server-only';

/**
 * Urgent escalation for HIGH-severity incidents — the AWS-native "push & urgent escalation" layer.
 *
 * Fired AFTER the incident is committed (so a notification hiccup can never roll back the report).
 * Two channels, both best-effort — this function NEVER throws:
 *   1. Amazon SNS publish to the escalation topic (fans out to every subscribed coordinator).
 *   2. A direct email to each notified member who has an address on file.
 *
 * Security/logging (see AGENTS.md): the SNS/email BODIES are the product's alert content (members
 * need to know what happened), but `serverLog` records only ids/counts — never the description, the
 * email addresses, or other PII.
 */
import { format } from 'date-fns';
import { sendEscalation, sendIncidentEscalationEmail, sendSms } from '@/lib/email';
import { getAppOrigin } from '@/lib/url';
import { serverLog } from '@/lib/log';
import type { IncidentType, Severity } from '@/components/incidents/types';

const TYPE_LABEL: Record<IncidentType, string> = {
  fall: 'Fall',
  hospitalization: 'Hospitalization',
  emergency: 'Emergency',
  other: 'Incident',
};

const SEVERITY_LABEL: Record<Severity, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export interface EscalationContact {
  email: string | null;
  /** Member's stored phone (may be blank / non-E.164; sendSms validates + skips bad numbers). */
  phone: string | null;
  name: string | null;
}

export interface EscalateParams {
  incidentId: string;
  circleId: string;
  type: IncidentType;
  severity: Severity;
  description: string;
  reporterName: string;
  recipientFirstName: string | null;
  occurredAt: Date;
  /** Members chosen to be notified (each emailed if they have an address, texted if they have a phone). */
  contacts: EscalationContact[];
}

/**
 * Escalate a high-severity incident across SNS + email. Best-effort and non-throwing — returns a
 * summary the caller can log. Intended to be awaited inside the report action's try-block.
 */
export async function escalateHighSeverityIncident(params: EscalateParams): Promise<void> {
  try {
    const origin = await getAppOrigin();
    const incidentUrl = `${origin}/incidents/${params.incidentId}`;
    const recipientName = params.recipientFirstName || 'your loved one';
    const typeLabel = TYPE_LABEL[params.type] ?? 'Incident';
    const severityLabel = SEVERITY_LABEL[params.severity] ?? 'High';
    const occurredAtLabel = format(params.occurredAt, 'PPp'); // e.g. "Jun 9, 2026, 7:40 AM"

    // 1) SNS fan-out to the escalation topic (coordinators subscribed at the topic level).
    const snsOk = await sendEscalation({
      subject: `Urgent: ${typeLabel} reported for ${recipientName}`,
      message:
        `${params.reporterName} reported ${typeLabel.toLowerCase()} for ${recipientName} ` +
        `(${severityLabel} severity) at ${occurredAtLabel}.\n\n${params.description}\n\nRespond: ${incidentUrl}`,
      attributes: {
        circleId: params.circleId,
        severity: params.severity,
        incidentId: params.incidentId,
        type: params.type,
      },
    });

    // 2) Direct email to each notified member with an address — independent, best-effort.
    const emails = params.contacts.map((c) => c.email).filter((e): e is string => Boolean(e));
    const emailResults = await Promise.allSettled(
      emails.map((to) =>
        sendIncidentEscalationEmail({
          to,
          recipientName,
          reporterName: params.reporterName,
          typeLabel,
          severityLabel,
          occurredAtLabel,
          description: params.description,
          incidentUrl,
        }),
      ),
    );
    const emailed = emailResults.filter((r) => r.status === 'fulfilled').length;

    // 3) Direct SMS to each notified member with a phone — a tight, single-segment-ish alert.
    const phones = params.contacts.map((c) => c.phone).filter((p): p is string => Boolean(p));
    const smsBody = `CareCircle: ${params.reporterName} reported ${typeLabel.toLowerCase()} for ${recipientName} (${severityLabel} severity). Respond: ${incidentUrl}`;
    const smsResults = await Promise.allSettled(phones.map((phone) => sendSms({ phone, message: smsBody })));
    const texted = smsResults.filter((r) => r.status === 'fulfilled' && r.value === true).length;

    serverLog('incidents', 'escalate', 'success', {
      incidentId: params.incidentId,
      sns: snsOk,
      emailed,
      emailRecipients: emails.length,
      texted,
      smsRecipients: phones.length,
    });
  } catch (err) {
    // A logging/escalation failure must never surface to the caller — the incident is already saved.
    serverLog('incidents', 'escalate', 'failure', {
      incidentId: params.incidentId,
      reason: (err as { name?: string })?.name ?? 'error',
    });
  }
}
