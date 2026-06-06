/**
 * Seed the demo circle (Antonio / Maria / Paolo / Grace).
 * Runs as the ADMIN connection (MIGRATION_DATABASE_URL) so it can insert across tables
 * without RLS getting in the way. Run with: npm run db:seed
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { scrypt as scryptCb, randomBytes } from 'node:crypto';
import * as schema from './schema';

// Same hash format as src/lib/password.ts (inlined here so the seed stays a plain node script
// and doesn't pull in the app's `server-only` guard). Gives the demo accounts a real login.
const DEMO_PASSWORD = 'CareCircle123';
function hashPassword(plain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scryptCb(plain, salt, 64, { N: 16384 }, (err, dk) =>
      err ? reject(err) : resolve(`scrypt$16384$${salt.toString('hex')}$${dk.toString('hex')}`),
    );
  });
}

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error('Set MIGRATION_DATABASE_URL (admin) or DATABASE_URL before seeding.');
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log('Seeding CareCircle demo data…');

  // Demo identities. Each gets the shared DEMO_PASSWORD so judges can sign in via
  // email/password (in production users are created by Auth.js on first sign-in).
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [maria] = await db
    .insert(schema.users)
    .values({ name: 'Maria Santos', email: 'maria@carecircle.demo', passwordHash })
    .returning();
  const [paolo] = await db
    .insert(schema.users)
    .values({ name: 'Paolo Santos', email: 'paolo@carecircle.demo', passwordHash })
    .returning();
  const [grace] = await db
    .insert(schema.users)
    .values({ name: 'Grace Reyes', email: 'grace@carecircle.demo', passwordHash })
    .returning();

  // Platform super-admin (CareCircle staff). Belongs to NO circle — they operate the platform
  // console at /admin. Access is granted by listing this email in PLATFORM_ADMIN_EMAILS.
  await db
    .insert(schema.users)
    .values({ name: 'CareCircle Admin', email: 'admin@carecircle.demo', passwordHash })
    .returning();

  // The care circle + the person being cared for.
  const [circle] = await db
    .insert(schema.careCircle)
    .values({ name: "Antonio's Care", primaryTimezone: 'Asia/Manila' })
    .returning();

  await db.insert(schema.careRecipientProfile).values({
    circleId: circle.id,
    fullName: 'Antonio Santos',
    dateOfBirth: '1948-04-12',
    bloodType: 'O+',
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    allergies: ['Penicillin'],
    mobility: 'Walks with a cane',
    dietaryNeeds: 'Low sodium',
    preferences: 'Enjoys morning walks and listening to old boleros.',
    primaryLanguage: 'Tagalog',
  });

  // Memberships = the access principals that RLS keys off.
  const [mariaM] = await db
    .insert(schema.membership)
    .values({ circleId: circle.id, userId: maria.id, role: 'owner', relationshipLabel: 'Daughter' })
    .returning();
  const [paoloM] = await db
    .insert(schema.membership)
    .values({ circleId: circle.id, userId: paolo.id, role: 'family', relationshipLabel: 'Son' })
    .returning();
  const [graceM] = await db
    .insert(schema.membership)
    .values({
      circleId: circle.id,
      userId: grace.id,
      role: 'caregiver',
      relationshipLabel: 'Home aide',
    })
    .returning();

  await db
    .update(schema.careCircle)
    .set({ ownerMembershipId: mariaM.id })
    .where(eq(schema.careCircle.id, circle.id));

  // A few timeline moments so the feed and dashboard have something real to show.
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000);
  await db.insert(schema.timelineEvent).values([
    {
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'med',
      summary: 'Grace gave Lisinopril 10mg (blood pressure).',
      occurredAt: hoursAgo(10),
    },
    {
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'note',
      summary: 'Antonio ate a good breakfast and walked 10 minutes in the garden.',
      occurredAt: hoursAgo(9),
    },
    {
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'vital',
      summary: 'Blood pressure 128/82 — normal.',
      occurredAt: hoursAgo(8),
    },
    {
      circleId: circle.id,
      actorMembershipId: mariaM.id,
      eventType: 'note',
      summary: 'Called Dad after dinner, he sounded cheerful.',
      occurredAt: hoursAgo(2),
    },
    {
      circleId: circle.id,
      actorMembershipId: paoloM.id,
      eventType: 'task',
      summary: 'Paolo ordered the refill for the heart medication.',
      occurredAt: hoursAgo(1),
    },
  ]);

  console.log('\nSeed complete.');
  console.log("  Circle id:        ", circle.id, "(Antonio's Care)");
  console.log('  Owner user (Maria):', maria.id);
  console.log('  Tip: set app.current_user_id to that user id to test RLS.');
  console.log('\nDemo sign-in credentials (email / password):');
  console.log(`  Coordinator    maria@carecircle.demo  ${DEMO_PASSWORD}`);
  console.log(`  Family         paolo@carecircle.demo  ${DEMO_PASSWORD}`);
  console.log(`  Caregiver      grace@carecircle.demo  ${DEMO_PASSWORD}`);
  console.log(`  Platform admin admin@carecircle.demo  ${DEMO_PASSWORD}  (→ /admin)`);

  await client.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
