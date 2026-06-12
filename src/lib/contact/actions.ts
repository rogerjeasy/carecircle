'use server';

/**
 * Contact-page server action — delivers the visitor's message to the team inbox through the real
 * email layer (SES / SMTP / Resend per `resolveProvider()`), replacing the former client-side
 * fake submit. Public route: there is no session or circle here, so per AGENTS.md it gets the
 * operational `serverLog` trail (masked email, no message body) but no `audit_log` row.
 */
import { z } from 'zod';
import { sendContactMessage } from '@/lib/email';
import { serverLog, maskEmail } from '@/lib/log';

const TOPIC_LABELS: Record<string, string> = {
  general: 'General enquiry',
  sales: 'Sales & plans',
  support: 'Help & support',
  partnerships: 'Partnerships',
  press: 'Press',
};

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  topic: z.enum(['general', 'sales', 'support', 'partnerships', 'press']),
  message: z.string().trim().min(10).max(5000),
});

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function submitContactMessage(formData: FormData): Promise<ContactResult> {
  serverLog('contact', 'submit', 'start', {});
  const parsed = schema.safeParse({
    name: formData.get('name')?.toString() ?? '',
    email: formData.get('email')?.toString() ?? '',
    topic: formData.get('topic')?.toString() ?? '',
    message: formData.get('message')?.toString() ?? '',
  });
  if (!parsed.success) {
    serverLog('contact', 'submit', 'failure', { reason: 'validation' });
    return { ok: false, error: 'Please check your details and try again.' };
  }

  const { name, email, topic, message } = parsed.data;
  try {
    await sendContactMessage({ name, email, topicLabel: TOPIC_LABELS[topic], message });
    serverLog('contact', 'submit', 'success', { from: maskEmail(email), topic });
    return { ok: true };
  } catch (err) {
    serverLog('contact', 'submit', 'failure', { from: maskEmail(email), topic, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: "We couldn't send your message right now. Please try again, or email us directly." };
  }
}
