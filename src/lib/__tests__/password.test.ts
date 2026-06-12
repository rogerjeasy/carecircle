/**
 * Password hashing (scrypt) — pure crypto tests, no AWS, no DB. Verifies the self-describing
 * stored format, round-tripping, and that verification fails closed on any malformed input.
 */
import { describe, it, expect } from 'vitest';
import { scryptSync, randomBytes } from 'node:crypto';

import { hashPassword, verifyPassword } from '@/lib/password';

describe('hashPassword', () => {
  it('produces the self-describing scrypt$N$salt$hash format', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(stored).toMatch(/^scrypt\$16384\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('salts every hash — the same password never hashes the same twice', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('round-trips: accepts the right password, rejects the wrong one', async () => {
    const stored = await hashPassword('s3cret-Phrase!');
    expect(await verifyPassword('s3cret-Phrase!', stored)).toBe(true);
    expect(await verifyPassword('s3cret-phrase!', stored)).toBe(false); // case matters
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('fails closed on missing or malformed stored values', async () => {
    expect(await verifyPassword('x', null)).toBe(false);
    expect(await verifyPassword('x', undefined)).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$2b$10$abcdef')).toBe(false); // wrong algorithm tag
    expect(await verifyPassword('x', 'scrypt$16384$deadbeef')).toBe(false); // missing a part
    expect(await verifyPassword('x', 'scrypt$NaN$00$00')).toBe(false); // bogus cost
    expect(await verifyPassword('x', 'scrypt$16384$$')).toBe(false); // empty salt + hash
  });

  it('rejects a tampered hash', async () => {
    const stored = await hashPassword('original');
    const flipped = stored.slice(0, -1) + (stored.endsWith('0') ? '1' : '0');
    expect(await verifyPassword('original', flipped)).toBe(false);
  });

  it('still verifies hashes stored with an older cost parameter (self-describing format)', async () => {
    // Simulate a hash written when COST was 8192: the stored string carries its own cost,
    // so verification must honor it rather than today's constant.
    const salt = randomBytes(16);
    const derived = scryptSync('migrate-me', salt, 64, { N: 8192 });
    const legacy = `scrypt$8192$${salt.toString('hex')}$${derived.toString('hex')}`;
    expect(await verifyPassword('migrate-me', legacy)).toBe(true);
    expect(await verifyPassword('wrong', legacy)).toBe(false);
  });
});
