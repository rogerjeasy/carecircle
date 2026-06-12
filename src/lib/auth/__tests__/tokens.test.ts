/**
 * One-time token helpers — pure crypto tests (no AWS, no DB). The raw token goes to the user;
 * only its SHA-256 lands in the database, so these two must stay high-entropy and deterministic
 * respectively.
 */
import { describe, it, expect } from 'vitest';

import { randomToken, hashToken } from '@/lib/auth/tokens';

describe('randomToken', () => {
  it('is URL-safe base64 of 32 random bytes (43 chars, no padding)', () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats', () => {
    const seen = new Set(Array.from({ length: 200 }, () => randomToken()));
    expect(seen.size).toBe(200);
  });
});

describe('hashToken', () => {
  it('is deterministic SHA-256 hex — the DB lookup key for a presented token', () => {
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('differs for different tokens and never echoes the input', () => {
    const t = randomToken();
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(t);
    expect(hashToken(t)).not.toBe(hashToken(randomToken()));
  });
});
