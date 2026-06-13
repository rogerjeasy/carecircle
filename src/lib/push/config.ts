import 'server-only';

/**
 * Web Push (VAPID) configuration. Push is OPTIONAL infrastructure: if the VAPID keys aren't set the
 * whole push channel degrades gracefully (the dispatcher skips it, the settings UI hides the device
 * toggle) — exactly like `isBedrockConfigured()` gates the AI features. Generate a keypair once with
 * `npx web-push generate-vapid-keys` and put it in the server env.
 */
export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** The PUBLIC application server key the browser needs to subscribe (safe to expose to the client). */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/** VAPID identity used to sign push requests. Only call when `isPushConfigured()`. */
export function vapidDetails(): { subject: string; publicKey: string; privateKey: string } {
  return {
    // A mailto:/https: contact the push service can reach about your sender — required by spec.
    subject: process.env.VAPID_SUBJECT || 'mailto:support@kintwadi.app',
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  };
}
