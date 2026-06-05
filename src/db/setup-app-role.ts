/**
 * Creates the least-privilege `carecircle_app` database role, grants it scoped access,
 * then connects AS that role to PROVE Row-Level Security is enforcing.
 *
 * Run as the admin connection:  npm run db:setup-rls
 *
 * Why a separate role: the admin/owner bypasses RLS (great for migrations/seed). The app
 * must connect as a NON-owner role so the policies actually apply. This is the deliberate,
 * Aurora-friendly two-role design from the data-model doc.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

/** Update/insert KEY=value lines in a .env file, preserving everything else. */
function upsertEnv(filePath: string, updates: Record<string, string>) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const seen = new Set<string>();
  const out = lines.map((line) => {
    const m = line.match(/^([A-Za-z0-9_]+)=/);
    if (m && updates[m[1]] !== undefined) {
      seen.add(m[1]);
      return `${m[1]}=${updates[m[1]]}`;
    }
    return line;
  });
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push(`${k}=${v}`);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  fs.writeFileSync(filePath, out.join('\n') + '\n');
}

const adminUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!adminUrl) {
  throw new Error('Set MIGRATION_DATABASE_URL (the admin connection) before running this.');
}

const parsed = new URL(adminUrl);
const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

// Strong, URL-safe password (hex = letters + digits only, no escaping headaches).
const appPassword = crypto.randomBytes(18).toString('hex');

const appUrlObj = new URL(adminUrl);
appUrlObj.username = 'carecircle_app';
appUrlObj.password = appPassword;
const appUrl = appUrlObj.toString();

const admin = postgres(adminUrl, { prepare: false, max: 1 });

async function main() {
  console.log('Creating least-privilege role "carecircle_app" and granting scoped access…');

  await admin.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'carecircle_app') THEN
        CREATE ROLE carecircle_app LOGIN PASSWORD '${appPassword}';
      ELSE
        ALTER ROLE carecircle_app WITH LOGIN PASSWORD '${appPassword}';
      END IF;
    END
    $$;
  `);

  for (const stmt of [
    `GRANT CONNECT ON DATABASE "${dbName}" TO carecircle_app`,
    `GRANT USAGE ON SCHEMA public TO carecircle_app`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carecircle_app`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carecircle_app`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carecircle_app`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO carecircle_app`,
  ]) {
    await admin.unsafe(stmt);
  }

  // Grab the owner's user id for the positive test (and the .env DEMO_USER_ID).
  const ownerRows = await admin`select user_id from membership where role = 'owner' limit 1`;
  const ownerId: string | undefined = ownerRows[0]?.user_id;

  await admin.end();

  // --- Prove RLS by connecting AS carecircle_app (subject to the policies) ---
  const app = postgres(appUrl, { prepare: false, max: 1 });

  const noCtx = await app`select count(*)::int as count from timeline_event`;
  const withoutCtx: number = noCtx[0].count;

  let withCtx = -1;
  if (ownerId) {
    await app.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${ownerId}, true)`;
      const rows = await tx`select count(*)::int as count from timeline_event`;
      withCtx = rows[0].count;
    });
  }
  await app.end();

  const pass = withoutCtx === 0 && withCtx > 0;

  console.log('\n──────────────── RLS verification (connected as carecircle_app) ────────────────');
  console.log(`  timeline_event WITHOUT a signed-in user : ${withoutCtx}   (expect 0  → RLS denies)`);
  console.log(`  timeline_event WITH the owner's context : ${withCtx}   (expect 5  → scoped to circle)`);
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(pass ? '  ✅ RLS is ENFORCING — tenant isolation works.' : '  ⚠️  Unexpected result — check the policies.');

  // Update .env automatically: point DATABASE_URL at the least-privilege role + set DEMO_USER_ID.
  const envPath = path.resolve(process.cwd(), '.env');
  upsertEnv(envPath, {
    DATABASE_URL: appUrl,
    ...(ownerId ? { DEMO_USER_ID: ownerId } : {}),
  });
  console.log(`\n.env updated: DATABASE_URL now uses the carecircle_app role${ownerId ? ' + DEMO_USER_ID set' : ''}.`);
  console.log('MIGRATION_DATABASE_URL (admin) is unchanged.');
  console.log('\nNext: restart `npm run dev` (Ctrl+C, then re-run) and refresh — the app now reads through RLS.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
