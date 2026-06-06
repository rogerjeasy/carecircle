/**
 * Platform super-admin access control.
 *
 * A platform admin is CareCircle *staff* — they can see across tenants (all circles), which by
 * definition crosses the per-circle RLS boundary. So they are deliberately NOT a circle role;
 * they're an explicit allowlist of emails (PLATFORM_ADMIN_EMAILS), decoupled from tenant data.
 * The email is taken from the verified Auth.js session, so it can't be spoofed by the client.
 */
import 'server-only';

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
