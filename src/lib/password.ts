/**
 * Password hashing for the email/password (Credentials) provider.
 *
 * Uses Node's built-in `scrypt` (a memory-hard KDF) — zero native dependencies, so it runs
 * reliably on Vercel's serverless Node runtime where bcrypt's native bindings often break.
 * Stored format: `scrypt$<N>$<saltHex>$<hashHex>`, self-describing so the cost can evolve.
 */
import 'server-only';
import { scrypt as scryptCb, randomBytes, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Promise wrapper that passes scrypt's options object (promisify's typings drop it).
function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

const KEYLEN = 64;
// scrypt cost parameter (CPU/memory). 2^16 is a sane interactive default.
const COST = 16384;
const SALT_BYTES = 16;

/** Hash a plaintext password into a self-describing, storable string. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(plain, salt, KEYLEN, { N: COST });
  return `scrypt$${COST}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** Constant-time verify a plaintext password against a stored hash. */
export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;

  const cost = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  if (!Number.isFinite(cost) || salt.length === 0 || expected.length === 0) return false;

  const derived = await scrypt(plain, salt, expected.length, { N: cost });
  // Lengths match by construction, but guard before the constant-time compare.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
