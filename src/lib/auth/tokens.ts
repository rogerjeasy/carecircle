/**
 * One-time token helpers (password reset today; reusable for invitations later).
 * The raw token is sent to the user; only its SHA-256 hash is stored, so the database
 * never holds anything that could be replayed to take over an account.
 */
import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

/** A URL-safe, high-entropy opaque token to embed in a link. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Stable hash of a token, for storage and lookup. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
