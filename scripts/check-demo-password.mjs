// One-off diagnostic: does maria's stored scrypt hash verify against the demo password?
// Read-only. Run: node scripts/check-demo-password.mjs
import 'dotenv/config';
import postgres from 'postgres';
import { scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });

function verify(plain, stored) {
  return new Promise((resolve) => {
    const [scheme, nStr, saltHex, dkHex] = stored.split('$');
    if (scheme !== 'scrypt') return resolve(false);
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(dkHex, 'hex');
    scryptCb(plain, salt, expected.length, { N: Number(nStr) }, (err, dk) =>
      resolve(!err && timingSafeEqual(dk, expected)),
    );
  });
}

try {
  const [u] = await sql`select password_hash from "user" where email = 'maria@carecircle.demo'`;
  if (!u) {
    console.log('maria not found');
  } else {
    console.log('hash format:', u.password_hash.split('$')[0], 'N =', u.password_hash.split('$')[1]);
    console.log('CareCircle123 verifies:', await verify('CareCircle123', u.password_hash));
  }
} catch (e) {
  console.error('ERR', e.code ?? '', e.message);
} finally {
  await sql.end();
}
