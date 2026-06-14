/**
 * Structured, sanitized server logging — the "observability" half of the project's
 * "audit every action" rule (AGENTS.md §6). Pairs with the durable per-circle `audit_log`:
 *
 *   - `audit_log` (src/db/audit.ts) = WHO changed WHAT in a circle, durably, for the platform
 *     admin's append-only ledger. Needs a `circle_id`, only records successes that touch tenant data.
 *   - `serverLog` (here) = the operational trail for EVERY server action / route: start, success,
 *     and FAILURE — including events with no circle yet (sign-up, password reset) and errors that
 *     never reach the ledger. Goes to the server console (Vercel logs), greppable by `[area]`.
 *
 * Rule of thumb for every endpoint/server action: emit `serverLog(area, action, 'success'|'failure')`,
 * and additionally `recordAuditEvent(...)` whenever the action changed tenant data in a known circle.
 *
 * Logging hygiene (AGENTS.md): NEVER pass raw secrets, tokens, passwords, or PII (emails, names,
 * health data) in `meta`. Use `maskEmail()` for addresses; log ids/counts/status, not content.
 */
import 'server-only';

// 'skipped' = the action was intentionally NOT performed (e.g. a send to an undeliverable demo
// address). It's an info-level outcome, distinct from a 'failure' (something went wrong).
export type LogStatus = 'start' | 'success' | 'failure' | 'skipped';
type LogValue = string | number | boolean | null | undefined;
export type LogMeta = Record<string, LogValue>;

/** Mask an email to its domain only — safe to log without exposing PII. */
export function maskEmail(email?: string | null): string {
  if (!email) return 'unknown';
  const at = email.indexOf('@');
  if (at < 1) return 'invalid';
  return `***@${email.slice(at + 1)}`;
}

/**
 * Best-effort Postgres error code (e.g. '42P01' undefined_table, '42501' insufficient_privilege).
 * Drizzle wraps DB errors, so the real `code` is often on a nested `.cause` — walk the chain.
 */
export function dbErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur; i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

function formatMeta(meta?: LogMeta): string {
  if (!meta) return '';
  const parts = Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v.replace(/\s+/g, '_') : v}`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}

/**
 * Emit one structured, sanitized log line for a server action / route handler.
 * Failures go to `console.error` (so they surface in Vercel's error stream); the rest to `info`.
 *
 *   serverLog('onboarding', 'completeOnboarding', 'success', { circleId, invites: 3 });
 *   serverLog('auth', 'signIn', 'failure', { reason: 'bad_credentials' });
 */
export function serverLog(area: string, action: string, status: LogStatus, meta?: LogMeta): void {
  const line = `[${area}] ${action} ${status}${formatMeta(meta)}`;
  if (status === 'failure') console.error(line);
  else console.info(line);
}
