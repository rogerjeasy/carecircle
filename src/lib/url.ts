import 'server-only';
import { headers } from 'next/headers';

/**
 * The app's own origin (`scheme://host`) — the single source of truth for building absolute links
 * (password-reset, invitations, welcome emails, …).
 *
 * Primary source = the CURRENT request host, which is correct in EVERY environment with zero
 * per-env configuration: `http://localhost:3000` in dev, and the real deployed origin on Vercel
 * (via `x-forwarded-host` / `x-forwarded-proto`). The same code therefore yields local links
 * locally and production links in production — so we never hard-pin a domain (the bug that sent
 * local reset/sign-out links to the deployed site).
 *
 * Env vars are ONLY a fallback for code paths with no incoming request (e.g. a future cron /
 * background job, where `headers()` isn't available): `AUTH_URL`, then Vercel's auto-injected
 * `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`, then a localhost default.
 */
export async function getAppOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  } catch {
    // `headers()` threw → no request scope. Fall back to the configured origin below.
  }
  return originFromEnv();
}

/** Origin derived from env, for non-request contexts. Never throws. */
function originFromEnv(): string {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, '');
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;
  return 'http://localhost:3000';
}
