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
  const timelineRows = await db
    .insert(schema.timelineEvent)
    .values([
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
        summary: 'Grace added a note',
        payload: { body: 'Antonio ate a good breakfast and walked 10 minutes in the garden.' },
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
        summary: 'Maria added a note',
        payload: { body: 'Called Dad after dinner, he sounded cheerful.' },
        occurredAt: hoursAgo(2),
      },
      {
        circleId: circle.id,
        actorMembershipId: paoloM.id,
        eventType: 'task',
        summary: 'Paolo ordered the refill for the heart medication.',
        occurredAt: hoursAgo(1),
      },
      // A private coordinator note — only Maria (the author) should see this via RLS.
      {
        circleId: circle.id,
        actorMembershipId: mariaM.id,
        eventType: 'note',
        summary: 'Maria added a note',
        payload: { body: 'Private: discuss the care schedule changes with the family next week.' },
        visibility: 'private' as const,
        occurredAt: hoursAgo(3),
      },
    ])
    .returning({ id: schema.timelineEvent.id });

  // Demo comments + reactions on the first (medication) event, so the feed shows conversation.
  const firstEventId = timelineRows[0].id;
  await db.insert(schema.timelineComment).values([
    {
      circleId: circle.id,
      timelineEventId: firstEventId,
      authorMembershipId: mariaM.id,
      body: 'Thanks Grace! Did he take it with food?',
    },
    {
      circleId: circle.id,
      timelineEventId: firstEventId,
      authorMembershipId: graceM.id,
      body: 'Yes, he had toast and juice first.',
    },
  ]);
  await db.insert(schema.timelineReaction).values([
    { circleId: circle.id, timelineEventId: firstEventId, membershipId: mariaM.id },
    { circleId: circle.id, timelineEventId: firstEventId, membershipId: paoloM.id },
  ]);

  // --- Medications: a realistic regimen for Antonio (scheduled + PRN + discontinued) ---------
  const todayAt = (h: number, m: number) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };
  const daysAgoAt = (days: number, h: number, m: number) => {
    const d = todayAt(h, m);
    d.setDate(d.getDate() - days);
    return d;
  };

  // Insert a scheduled medication + its dose-time(s); returns the schedule rows for dosing.
  async function addScheduledMed(
    med: {
      name: string;
      strength: string;
      form: (typeof schema.medFormEnum.enumValues)[number];
      route: (typeof schema.medRouteEnum.enumValues)[number];
      purpose: string;
      prescriber: string;
      supplyCount: number;
      refillThreshold?: number;
    },
    times: string[],
  ) {
    const [row] = await db
      .insert(schema.medication)
      .values({ circleId: circle.id, ...med, refillThreshold: med.refillThreshold ?? 7 })
      .returning();
    const schedules = await db
      .insert(schema.medicationSchedule)
      .values(times.map((t) => ({ circleId: circle.id, medicationId: row.id, timeOfDay: t })))
      .returning();
    return { med: row, schedules };
  }

  const lisinopril = await addScheduledMed(
    { name: 'Lisinopril', strength: '10mg', form: 'tablet', route: 'oral', purpose: 'Blood pressure', prescriber: 'Dr. Chen', supplyCount: 24 },
    ['08:00'],
  );
  const metformin = await addScheduledMed(
    { name: 'Metformin', strength: '500mg', form: 'tablet', route: 'oral', purpose: 'Blood sugar', prescriber: 'Dr. Chen', supplyCount: 3 },
    ['08:00', '20:00'],
  );
  const vitaminD = await addScheduledMed(
    { name: 'Vitamin D', strength: '1000 IU', form: 'capsule', route: 'oral', purpose: 'Bone health', prescriber: 'Dr. Chen', supplyCount: 40 },
    ['08:00'],
  );
  await addScheduledMed(
    { name: 'Aspirin', strength: '81mg', form: 'tablet', route: 'oral', purpose: 'Heart', prescriber: 'Dr. Chen', supplyCount: 6 },
    ['13:00'],
  );
  await addScheduledMed(
    { name: 'Atorvastatin', strength: '20mg', form: 'tablet', route: 'oral', purpose: 'Cholesterol', prescriber: 'Dr. Patel', supplyCount: 18 },
    ['20:00'],
  );
  await addScheduledMed(
    { name: 'Donepezil', strength: '10mg', form: 'tablet', route: 'oral', purpose: 'Memory', prescriber: 'Dr. Okafor', supplyCount: 11 },
    ['21:30'],
  );

  // PRN (as-needed) medications.
  const [paracetamol] = await db
    .insert(schema.medication)
    .values({ circleId: circle.id, name: 'Paracetamol', strength: '500mg', form: 'tablet', route: 'oral', purpose: 'Pain & fever', prescriber: 'Dr. Chen', supplyCount: 30, isPrn: true, prnMaxPerDay: 4 })
    .returning();
  await db
    .insert(schema.medication)
    .values({ circleId: circle.id, name: 'Lorazepam', strength: '0.5mg', form: 'tablet', route: 'oral', purpose: 'Anxiety (as needed)', prescriber: 'Dr. Chen', supplyCount: 20, isPrn: true, prnMaxPerDay: 2 });

  // Discontinued (kept for history; shown collapsed in the UI).
  await db.insert(schema.medication).values([
    { circleId: circle.id, name: 'Amlodipine', strength: '5mg', form: 'tablet', route: 'oral', purpose: 'Blood pressure', prescriber: 'Dr. Chen', supplyCount: 0, isActive: false, discontinuedAt: daysAgoAt(40, 0, 0), discontinuedNote: 'Stopped Apr 2026 · replaced by Lisinopril' },
    { circleId: circle.id, name: 'Omeprazole', strength: '20mg', form: 'capsule', route: 'oral', purpose: 'Acid reflux', prescriber: 'Dr. Patel', supplyCount: 0, isActive: false, discontinuedAt: daysAgoAt(120, 0, 0), discontinuedNote: 'Stopped Jan 2026' },
  ]);

  // Today's recorded doses (Grace, the caregiver, gave the morning meds).
  await db.insert(schema.medicationAdministration).values([
    { circleId: circle.id, medicationId: lisinopril.med.id, scheduleId: lisinopril.schedules[0].id, scheduledFor: todayAt(8, 0), status: 'given', administeredAt: todayAt(8, 4), administeredByMembershipId: graceM.id },
    { circleId: circle.id, medicationId: metformin.med.id, scheduleId: metformin.schedules[0].id, scheduledFor: todayAt(8, 0), status: 'given', administeredAt: todayAt(8, 6), administeredByMembershipId: graceM.id },
    { circleId: circle.id, medicationId: vitaminD.med.id, scheduleId: vitaminD.schedules[0].id, scheduledFor: todayAt(8, 0), status: 'given', administeredAt: todayAt(8, 6), administeredByMembershipId: graceM.id },
    // One PRN use earlier today.
    { circleId: circle.id, medicationId: paracetamol.id, scheduleId: null, scheduledFor: null, status: 'given', administeredAt: todayAt(6, 20), administeredByMembershipId: graceM.id },
  ]);

  // A week of Lisinopril history so the adherence mini-grid has something real to show.
  await db.insert(schema.medicationAdministration).values(
    [1, 2, 3, 4, 5, 6].map((d) => ({
      circleId: circle.id,
      medicationId: lisinopril.med.id,
      scheduleId: lisinopril.schedules[0].id,
      scheduledFor: daysAgoAt(d, 8, 0),
      status: (d === 4 ? 'missed' : 'given') as (typeof schema.doseStatusEnum.enumValues)[number],
      administeredAt: d === 4 ? null : daysAgoAt(d, 8, 5),
      administeredByMembershipId: graceM.id,
    })),
  );

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
