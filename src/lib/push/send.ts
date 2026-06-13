import 'server-only';

/**
 * Low-level Web Push delivery. Sends a JSON payload to one browser subscription via the Web Push
 * protocol (VAPID). Pure transport — the dispatcher decides WHO/WHETHER; this just sends and reports
 * back whether the endpoint is gone (HTTP 404/410), so the caller can prune dead subscriptions.
 *
 * Never logs the endpoint or keys (per-device tokens). `web-push` is a CommonJS Node library, so this
 * module is server-only and runs in the Node runtime.
 */
import webpush from 'web-push';
import { isPushConfigured, vapidDetails } from './config';

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Where clicking the notification deep-links (path under the app origin). */
  url: string;
  tag?: string;
  urgent?: boolean;
}

export type PushResult = 'sent' | 'gone' | 'error';

let vapidReady = false;
function ensureVapid(): void {
  if (vapidReady) return;
  const v = vapidDetails();
  webpush.setVapidDetails(v.subject, v.publicKey, v.privateKey);
  vapidReady = true;
}

/** Send one push. Returns 'gone' when the subscription has expired so the caller can delete it. */
export async function sendWebPush(sub: StoredSubscription, payload: PushPayload): Promise<PushResult> {
  if (!isPushConfigured()) return 'error';
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: payload.urgent ? 60 * 60 : 60 * 60 * 24, urgency: payload.urgent ? 'high' : 'normal' },
    );
    return 'sent';
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    // 404 Not Found / 410 Gone → the browser unsubscribed; the row should be pruned.
    if (status === 404 || status === 410) return 'gone';
    return 'error';
  }
}
