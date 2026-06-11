/**
 * Seed the demo circle (Antonio / Maria / Paolo / Grace / Rosa) with a LIVING record:
 * six weeks of medications, vitals (with a gentle decline trend), appointments, tasks,
 * rota shifts, documents in all three sensitivity tiers, one resolved incident, past
 * daily digests, and an audit trail — so a judge signs in to a real, breathing circle.
 *
 * Runs as the ADMIN connection (MIGRATION_DATABASE_URL) so it can insert across tables
 * without RLS getting in the way. Run with: npm run db:seed
 *
 * Documents: tiny demo PDFs are generated in-process and uploaded to S3 when S3_BUCKET +
 * AWS_REGION (and credentials) are configured; otherwise the rows are still inserted so the
 * vault (and the RBAC deny) renders — files just won't open until a real upload replaces them.
 *
 * Ask Kintwadi: after seeding, embed the record into Aurora pgvector with the backfill
 * route (POST /api/ingest as the platform admin) so retrieval has chunks to search.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray, sql } from 'drizzle-orm';
import { scrypt as scryptCb, randomBytes, randomUUID } from 'node:crypto';
import * as schema from './schema';

// Same hash format as src/lib/password.ts (inlined here so the seed stays a plain node script
// and doesn't pull in the app's `server-only` guard). Gives the demo accounts a real login.
const DEMO_PASSWORD = 'Kintwadi123';
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

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (mulberry32) so re-seeds produce the same story.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260629);

// ---------------------------------------------------------------------------
// Date helpers (relative to "now" so the circle always looks current).
// ---------------------------------------------------------------------------
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
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
const daysAheadAt = (days: number, h: number, m: number) => daysAgoAt(-days, h, m);
const dateStr = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Tiny valid one-page PDF (Helvetica, title + lines) for the demo documents.
// ---------------------------------------------------------------------------
function tinyPdf(title: string, lines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = [
    'BT',
    '/F1 18 Tf',
    '72 720 Td',
    `(${esc(title)}) Tj`,
    '/F1 11 Tf',
    '0 -30 Td',
    ...lines.flatMap((l) => [`(${esc(l)}) Tj`, '0 -16 Td']),
    'ET',
  ].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

// Standalone S3 upload (the app's s3.ts is `server-only`; the seed is a plain node script).
// Uses the default AWS credential chain. Best-effort: rows are inserted either way.
const S3_BUCKET = process.env.S3_BUCKET;
let s3: import('@aws-sdk/client-s3').S3Client | null = null;
let uploadedPdfs = 0;
async function uploadDemoPdf(circleId: string, title: string, lines: string[]): Promise<{ key: string; size: number }> {
  const body = tinyPdf(title, lines);
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const key = `care-circles/${circleId}/documents/${yyyy}/${mm}/${randomUUID()}.pdf`;
  if (S3_BUCKET && process.env.AWS_REGION) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      if (!s3) s3 = new S3Client({ region: process.env.AWS_REGION });
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: 'application/pdf',
          ServerSideEncryption: 'AES256',
        }),
      );
      uploadedPdfs += 1;
    } catch (err) {
      console.warn('  (S3 upload skipped for one document:', (err as Error)?.name ?? 'error', ')');
    }
  }
  return { key, size: body.length };
}

const DEMO_EMAILS = [
  'maria@kintwadi.demo',
  'paolo@kintwadi.demo',
  'grace@kintwadi.demo',
  'antonio@kintwadi.demo',
  'rosa@kintwadi.demo',
  'chen@kintwadi.demo',
  'admin@kintwadi.demo',
];

/**
 * Idempotency: wipe any previous demo seed before re-seeding. Deleting the demo users' circles
 * cascades through every tenant table (all carry `circle_id … ON DELETE CASCADE`); the append-only
 * `audit_log` deliberately has NO foreign key, so its rows are removed explicitly. Real (non-demo)
 * users and circles are untouched — only data reachable from the @kintwadi.demo accounts goes.
 */
async function resetDemoData() {
  const demoUsers = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.email, DEMO_EMAILS));
  // Anonymous "Run demo" guests (see src/lib/auth/demo.ts) are wiped along with the circle.
  const guestUsers = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`${schema.users.email} like '%@guest.kintwadi.demo'`);
  demoUsers.push(...guestUsers);
  if (demoUsers.length === 0) return;
  const userIds = demoUsers.map((u) => u.id);

  const demoMemberships = await db
    .select({ circleId: schema.membership.circleId })
    .from(schema.membership)
    .where(inArray(schema.membership.userId, userIds));
  const circleIds = [...new Set(demoMemberships.map((m) => m.circleId))];

  if (circleIds.length > 0) {
    await db.delete(schema.auditLog).where(inArray(schema.auditLog.circleId, circleIds));
    await db.delete(schema.careCircle).where(inArray(schema.careCircle.id, circleIds));
  }
  await db.delete(schema.platformAuthAudit).where(inArray(schema.platformAuthAudit.actorUserId, userIds));
  await db.delete(schema.users).where(inArray(schema.users.id, userIds));
  console.log(`  Reset previous demo data (${circleIds.length} circle(s), ${userIds.length} user(s)).`);
}

async function main() {
  console.log('Seeding Kintwadi demo data…');
  await resetDemoData();

  // ---------------------------------------------------------------------------
  // People. Each gets the shared DEMO_PASSWORD so judges can sign in via
  // email/password (in production users are created by Auth.js on first sign-in).
  // ---------------------------------------------------------------------------
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [maria] = await db
    .insert(schema.users)
    .values({ name: 'Maria Santos', email: 'maria@kintwadi.demo', passwordHash })
    .returning();
  const [paolo] = await db
    .insert(schema.users)
    .values({ name: 'Paolo Santos', email: 'paolo@kintwadi.demo', passwordHash })
    .returning();
  const [grace] = await db
    .insert(schema.users)
    .values({ name: 'Grace Reyes', email: 'grace@kintwadi.demo', passwordHash })
    .returning();
  // The care recipient himself — the "dignity lens": a simplified, respectful view of his own day.
  const [antonio] = await db
    .insert(schema.users)
    .values({ name: 'Antonio Santos', email: 'antonio@kintwadi.demo', passwordHash })
    .returning();
  // Read-only extended family — reassurance without edit rights (and no restricted documents).
  const [rosa] = await db
    .insert(schema.users)
    .values({ name: 'Rosa Mendoza', email: 'rosa@kintwadi.demo', passwordHash })
    .returning();

  // Platform super-admin (Kintwadi staff). Belongs to NO circle — they operate the platform
  // console at /admin. Access is granted by listing this email in PLATFORM_ADMIN_EMAILS.
  await db
    .insert(schema.users)
    .values({ name: 'Kintwadi Admin', email: 'admin@kintwadi.demo', passwordHash })
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
    conditions: ['Hypertension', 'Type 2 Diabetes', 'Mild cognitive impairment'],
    allergies: ['Penicillin'],
    mobility: 'Walks with a cane',
    dietaryNeeds: 'Low sodium',
    preferences: 'Enjoys morning walks and listening to old boleros.',
    primaryLanguage: 'Tagalog',
    advanceDirective: 'Advance directive on file (see Documents). DNR: no. Healthcare proxy: Maria Santos.',
    emergencyContacts: [
      { name: 'Maria Santos', relationship: 'Daughter · healthcare proxy', phone: '+1 416 555 0181' },
      { name: 'Grace Reyes', relationship: 'Home aide (mornings)', phone: '+63 917 555 0144' },
      { name: 'Dr. Lourdes Chen', relationship: 'Cardiologist — Manila Heart Center', phone: '+63 2 8555 0123' },
    ],
    insuranceSummary: { provider: 'PhilHealth + private (MediCare Plus)', memberId: 'MCP-4471-220', notes: 'Card in Documents' },
  });

  // Memberships = the access principals that RLS keys off.
  // `preferredLanguage` drives the multilingual Daily Digest (Grace & Antonio read it in Tagalog).
  const [mariaM] = await db
    .insert(schema.membership)
    .values({ circleId: circle.id, userId: maria.id, role: 'owner', relationshipLabel: 'Daughter', phone: '+1 416 555 0181' })
    .returning();
  const [paoloM] = await db
    .insert(schema.membership)
    .values({ circleId: circle.id, userId: paolo.id, role: 'family', relationshipLabel: 'Son', phone: '+971 50 555 0192' })
    .returning();
  const [graceM] = await db
    .insert(schema.membership)
    .values({
      circleId: circle.id,
      userId: grace.id,
      role: 'caregiver',
      relationshipLabel: 'Home aide',
      phone: '+63 917 555 0144',
      preferredLanguage: 'tl',
    })
    .returning();
  const [antonioM] = await db
    .insert(schema.membership)
    .values({
      circleId: circle.id,
      userId: antonio.id,
      role: 'care_recipient',
      relationshipLabel: 'Father',
      preferredLanguage: 'tl',
    })
    .returning();
  const [rosaM] = await db
    .insert(schema.membership)
    .values({ circleId: circle.id, userId: rosa.id, role: 'read_only', relationshipLabel: 'Sister-in-law' })
    .returning();
  // The cardiologist — the sixth lens: a clinician's read-mostly summary view, and the
  // "Primary doctor" block on the emergency card (which looks for an active clinician member).
  const [chen] = await db
    .insert(schema.users)
    .values({ name: 'Dr. Lourdes Chen', email: 'chen@kintwadi.demo', passwordHash })
    .returning();
  await db
    .insert(schema.membership)
    .values({
      circleId: circle.id,
      userId: chen.id,
      role: 'clinician',
      relationshipLabel: 'Cardiologist',
      phone: '+63 2 8555 0123',
    })
    .returning();

  // The Plus plan (see /pricing) — the monetizable-B2C story: AI digest + Ask live on this tier.
  await db
    .update(schema.careCircle)
    .set({ ownerMembershipId: mariaM.id, plan: 'plus' })
    .where(eq(schema.careCircle.id, circle.id));

  // A pending invite so the People screen shows the flow mid-flight.
  await db.insert(schema.invitation).values({
    circleId: circle.id,
    email: 'dr.okafor@manilaclinic.demo',
    role: 'clinician',
    relationshipLabel: 'Geriatrician',
    token: randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
    invitedByMembershipId: mariaM.id,
    personalNote: 'Doctor, this gives you read access to Papa\'s record ahead of the follow-up.',
    expiresAt: daysAheadAt(7, 12, 0),
  });

  // ---------------------------------------------------------------------------
  // Medications: a realistic regimen (scheduled + PRN + discontinued).
  // ---------------------------------------------------------------------------
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
  const aspirin = await addScheduledMed(
    { name: 'Aspirin', strength: '81mg', form: 'tablet', route: 'oral', purpose: 'Heart', prescriber: 'Dr. Chen', supplyCount: 6 },
    ['13:00'],
  );
  const atorvastatin = await addScheduledMed(
    { name: 'Atorvastatin', strength: '20mg', form: 'tablet', route: 'oral', purpose: 'Cholesterol', prescriber: 'Dr. Patel', supplyCount: 18 },
    ['20:00'],
  );
  const donepezil = await addScheduledMed(
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

  // ---- Four weeks of adherence history for EVERY scheduled med (~93% given) ----
  // Weekday morning/midday doses are given by Grace; weekends by Maria; the late-evening
  // Donepezil Antonio takes himself ('taken'). A few missed/skipped keep the grid honest.
  const allSlots = [
    ...lisinopril.schedules.map((s) => ({ med: lisinopril.med, s })),
    ...metformin.schedules.map((s) => ({ med: metformin.med, s })),
    ...vitaminD.schedules.map((s) => ({ med: vitaminD.med, s })),
    ...aspirin.schedules.map((s) => ({ med: aspirin.med, s })),
    ...atorvastatin.schedules.map((s) => ({ med: atorvastatin.med, s })),
    ...donepezil.schedules.map((s) => ({ med: donepezil.med, s })),
  ];
  type AdminRow = typeof schema.medicationAdministration.$inferInsert;
  const adminRows: AdminRow[] = [];
  for (let d = 28; d >= 1; d--) {
    for (const { med, s } of allSlots) {
      const [hh, mm] = s.timeOfDay.split(':').map(Number);
      const scheduledFor = daysAgoAt(d, hh, mm);
      const dow = scheduledFor.getDay(); // 0 = Sun, 6 = Sat
      const r = rng();
      let status: (typeof schema.doseStatusEnum.enumValues)[number] = 'given';
      if (r > 0.96) status = 'missed';
      else if (r > 0.93) status = 'skipped';
      const isEveningSelf = s.timeOfDay >= '21:00';
      if (status === 'given' && isEveningSelf) status = 'taken';
      const by = isEveningSelf ? antonioM.id : dow === 0 || dow === 6 ? mariaM.id : graceM.id;
      adminRows.push({
        circleId: circle.id,
        medicationId: med.id,
        scheduleId: s.id,
        scheduledFor,
        status,
        administeredAt: status === 'given' || status === 'taken' ? new Date(scheduledFor.getTime() + Math.floor(rng() * 12) * 60_000) : null,
        administeredByMembershipId: status === 'missed' ? null : by,
      });
    }
  }
  // Today's doses so the Today tab is mid-story when a judge opens it.
  adminRows.push(
    { circleId: circle.id, medicationId: lisinopril.med.id, scheduleId: lisinopril.schedules[0].id, scheduledFor: todayAt(8, 0), status: 'given', administeredAt: todayAt(8, 4), administeredByMembershipId: graceM.id },
    { circleId: circle.id, medicationId: metformin.med.id, scheduleId: metformin.schedules[0].id, scheduledFor: todayAt(8, 0), status: 'given', administeredAt: todayAt(8, 6), administeredByMembershipId: graceM.id },
    { circleId: circle.id, medicationId: vitaminD.med.id, scheduleId: vitaminD.schedules[0].id, scheduledFor: todayAt(8, 0), status: 'given', administeredAt: todayAt(8, 6), administeredByMembershipId: graceM.id },
    // One PRN use earlier today.
    { circleId: circle.id, medicationId: paracetamol.id, scheduleId: null, scheduledFor: null, status: 'given', administeredAt: todayAt(6, 20), administeredByMembershipId: graceM.id },
  );
  await db.insert(schema.medicationAdministration).values(adminRows);

  // ---------------------------------------------------------------------------
  // Vitals: six weeks of observations with a story — BP drifting up over the last
  // ten days (the decline-scan talking point), weight easing down, mood dipping
  // briefly after the fall (day 12), everything else steady.
  // ---------------------------------------------------------------------------
  type ObsRow = typeof schema.observation.$inferInsert;
  const obsRows: ObsRow[] = [];
  for (let d = 42; d >= 0; d--) {
    const recordedBy = d % 7 >= 5 ? mariaM.id : graceM.id;
    // Blood pressure — daily, morning. Base 124/79, rising ~+1.2/day systolic in the last 10 days.
    const rise = d <= 10 ? (10 - d) * 1.2 : 0;
    obsRows.push({
      circleId: circle.id,
      metric: 'bp',
      value: Math.round(124 + rise + (rng() * 6 - 3)),
      secondary: Math.round(79 + rise / 3 + (rng() * 4 - 2)),
      recordedAt: daysAgoAt(d, 8, 30),
      recordedByMembershipId: recordedBy,
      ...(d === 0 ? { note: 'Slightly high again this morning — flagged for the follow-up.' } : {}),
    });
    // Glucose — daily, fasting.
    obsRows.push({
      circleId: circle.id,
      metric: 'glucose',
      value: Math.round(112 + (rng() * 22 - 11)),
      recordedAt: daysAgoAt(d, 7, 45),
      recordedByMembershipId: recordedBy,
    });
    // Sleep + mood — daily. Mood dips for two days after the fall on day 12.
    obsRows.push({
      circleId: circle.id,
      metric: 'sleep',
      value: Math.round((6.6 + rng() * 1.6) * 10) / 10,
      recordedAt: daysAgoAt(d, 7, 0),
      recordedByMembershipId: recordedBy,
    });
    const moodBase = d === 11 || d === 10 ? 2.4 : 3.6;
    obsRows.push({
      circleId: circle.id,
      metric: 'mood',
      value: Math.min(5, Math.max(1, Math.round((moodBase + rng() * 1.2) * 10) / 10)),
      recordedAt: daysAgoAt(d, 18, 0),
      recordedByMembershipId: recordedBy,
    });
    // Heart rate — every other day; weight — weekly, easing 72.0 → ~70.6 kg.
    if (d % 2 === 0) {
      obsRows.push({
        circleId: circle.id,
        metric: 'hr',
        value: Math.round(71 + (rng() * 8 - 4)),
        recordedAt: daysAgoAt(d, 9, 0),
        recordedByMembershipId: recordedBy,
      });
    }
    if (d % 7 === 0) {
      obsRows.push({
        circleId: circle.id,
        metric: 'weight',
        value: Math.round((70.6 + (d / 42) * 1.4 + (rng() * 0.4 - 0.2)) * 10) / 10,
        recordedAt: daysAgoAt(d, 8, 0),
        recordedByMembershipId: recordedBy,
      });
    }
  }
  await db.insert(schema.observation).values(obsRows);

  // Custom per-circle safe range for BP (shows the Alerts settings are real, not defaults).
  await db.insert(schema.healthAlertSetting).values({
    circleId: circle.id,
    metric: 'bp',
    enabled: true,
    min: 95,
    max: 142,
    diaMin: 60,
    diaMax: 92,
    updatedByMembershipId: mariaM.id,
  });

  // ---------------------------------------------------------------------------
  // Appointments: a past trail (incl. THE cardiologist visit Ask Kintwadi gets
  // asked about) + an upcoming follow-up with open prep questions.
  // ---------------------------------------------------------------------------
  const apptRows = await db
    .insert(schema.appointment)
    .values([
      {
        circleId: circle.id,
        title: 'Cardiology check-up',
        kind: 'specialist' as const,
        provider: 'Dr. Lourdes Chen',
        location: 'Manila Heart Center, Rm 304',
        startsAt: daysAgoAt(20, 10, 0),
        durationMin: 45,
        assignedToMembershipId: graceM.id,
        status: 'completed' as const,
        prep: [
          { id: 'p1', text: 'Bring the BP log from the last month', done: true },
          { id: 'p2', text: 'Ask about the occasional dizziness', done: true },
        ],
        visitSummary:
          'Dr. Chen reviewed the BP log — average trending slightly up. Lisinopril kept at 10mg for now; recheck in 4 weeks. ECG normal. She asked us to log BP every morning and call if systolic passes 150.',
        postedToTimeline: true,
        createdByMembershipId: mariaM.id,
      },
      {
        circleId: circle.id,
        title: 'Blood panel (fasting)',
        kind: 'lab' as const,
        provider: 'HiPrecision Diagnostics',
        location: 'Quezon City branch',
        startsAt: daysAgoAt(8, 7, 30),
        durationMin: 30,
        assignedToMembershipId: graceM.id,
        status: 'completed' as const,
        prep: [{ id: 'p1', text: 'No food after midnight', done: true }],
        visitSummary: 'HbA1c 7.1% (down from 7.4). Lipids stable. Results uploaded to Documents.',
        postedToTimeline: true,
        createdByMembershipId: mariaM.id,
      },
      {
        circleId: circle.id,
        title: 'Dental cleaning',
        kind: 'dental' as const,
        provider: 'SmileCare Dental',
        startsAt: daysAgoAt(35, 14, 0),
        durationMin: 60,
        assignedToMembershipId: mariaM.id,
        status: 'completed' as const,
        visitSummary: 'Routine cleaning, no issues.',
        createdByMembershipId: mariaM.id,
      },
      {
        circleId: circle.id,
        title: 'Cardiology follow-up',
        kind: 'specialist' as const,
        provider: 'Dr. Lourdes Chen',
        location: 'Manila Heart Center, Rm 304',
        startsAt: daysAheadAt(6, 10, 30),
        durationMin: 45,
        assignedToMembershipId: mariaM.id,
        status: 'needs-prep' as const,
        prep: [
          { id: 'p1', text: 'Print the last 4 weeks of BP readings', done: true },
          { id: 'p2', text: 'Ask whether the rising morning BP needs a dose change', done: false },
          { id: 'p3', text: 'Ask about cleared-for-travel for the December trip', done: false },
        ],
        createdByMembershipId: mariaM.id,
      },
      {
        circleId: circle.id,
        title: 'Physiotherapy session',
        kind: 'therapy' as const,
        provider: 'MoveWell PT',
        startsAt: daysAheadAt(2, 9, 0),
        durationMin: 60,
        assignedToMembershipId: graceM.id,
        status: 'confirmed' as const,
        prep: [{ id: 'p1', text: 'Comfortable shoes + the cane', done: false }],
        createdByMembershipId: paoloM.id,
      },
    ])
    .returning({ id: schema.appointment.id, title: schema.appointment.title });

  // ---------------------------------------------------------------------------
  // Tasks: the coordination layer + the fair-share story. Maria carries the most,
  // but Paolo and Grace are visibly contributing — the resentment defuser.
  // ---------------------------------------------------------------------------
  const doneTask = (
    title: string,
    category: (typeof schema.taskCategoryEnum.enumValues)[number],
    by: string,
    daysAgo: number,
  ) => ({
    circleId: circle.id,
    title,
    category,
    status: 'done' as const,
    assignedToMembershipId: by,
    completedAt: daysAgoAt(daysAgo, 17, 0),
    completedByMembershipId: by,
    createdByMembershipId: mariaM.id,
    updatedAt: daysAgoAt(daysAgo, 17, 0),
  });
  await db.insert(schema.tasks).values([
    // Done this week (feeds the fair-share bars).
    doneTask('Call the insurance about the claim', 'admin', mariaM.id, 1),
    doneTask('Weekly grocery run (low-sodium list)', 'errand', mariaM.id, 2),
    doneTask('Pick up Metformin refill', 'refill', graceM.id, 2),
    doneTask('Order the BP cuff replacement batteries', 'errand', paoloM.id, 3),
    doneTask('Book the cardiology follow-up', 'medical', paoloM.id, 4),
    doneTask('Morning walk with Antonio', 'visit', graceM.id, 1),
    // Done last week.
    doneTask('Renew the senior-citizen discount card', 'admin', mariaM.id, 8),
    doneTask('Sunday video call with Papa', 'visit', paoloM.id, 7),
    doneTask('Refill the weekly pill organizer', 'refill', graceM.id, 9),
    // Open / in motion.
    {
      circleId: circle.id,
      title: 'Order Aspirin refill (6 left)',
      details: 'Mercury Drug delivers next-day. Threshold alert fired.',
      category: 'refill' as const,
      status: 'open' as const,
      assignedToMembershipId: paoloM.id,
      dueAt: daysAheadAt(1, 18, 0),
      createdByMembershipId: graceM.id,
    },
    {
      circleId: circle.id,
      title: 'Collect the blood-panel hard copy',
      category: 'medical' as const,
      status: 'doing' as const,
      assignedToMembershipId: graceM.id,
      dueAt: daysAheadAt(2, 12, 0),
      createdByMembershipId: mariaM.id,
    },
    {
      circleId: circle.id,
      title: 'Compare grab-bar installers for the bathroom',
      details: 'After the fall — two quotes so far.',
      category: 'admin' as const,
      status: 'doing' as const,
      assignedToMembershipId: mariaM.id,
      dueAt: daysAheadAt(4, 18, 0),
      createdByMembershipId: mariaM.id,
    },
    {
      circleId: circle.id,
      title: 'Sunday family video call',
      category: 'visit' as const,
      status: 'open' as const,
      assignedToMembershipId: paoloM.id,
      dueAt: daysAheadAt(5, 20, 0),
      recurrence: 'weekly',
      createdByMembershipId: paoloM.id,
    },
    {
      circleId: circle.id,
      title: 'Schedule the eye exam',
      category: 'medical' as const,
      status: 'open' as const,
      createdByMembershipId: mariaM.id,
    },
  ]);

  // ---------------------------------------------------------------------------
  // Care rota: Grace weekday mornings in person; Maria weekday evenings on call;
  // Paolo owns the weekend on-call (his time zone makes evenings easy).
  // ---------------------------------------------------------------------------
  type ShiftRow = typeof schema.careShift.$inferInsert;
  const shifts: ShiftRow[] = [];
  for (let day = 1; day <= 6; day++) {
    shifts.push({ circleId: circle.id, assignedToMembershipId: graceM.id, dayIndex: day, startTime: '07:00', endTime: '11:00', shiftType: 'in-person', createdByMembershipId: mariaM.id });
  }
  for (let day = 1; day <= 5; day++) {
    shifts.push({ circleId: circle.id, assignedToMembershipId: mariaM.id, dayIndex: day, startTime: '18:00', endTime: '22:00', shiftType: 'on-call', createdByMembershipId: mariaM.id });
  }
  shifts.push(
    { circleId: circle.id, assignedToMembershipId: paoloM.id, dayIndex: 0, startTime: '08:00', endTime: '20:00', shiftType: 'on-call', createdByMembershipId: mariaM.id },
    { circleId: circle.id, assignedToMembershipId: paoloM.id, dayIndex: 6, startTime: '12:00', endTime: '20:00', shiftType: 'on-call', createdByMembershipId: mariaM.id },
  );
  await db.insert(schema.careShift).values(shifts);

  // ---------------------------------------------------------------------------
  // Documents: all three sensitivity tiers — the RBAC showcase. Grace (caregiver)
  // sees standard + sensitive; the restricted financial/legal rows are filtered
  // out BY THE DATABASE for her, Rosa, and Antonio.
  // ---------------------------------------------------------------------------
  const docDefs: {
    title: string;
    category: (typeof schema.docCategoryEnum.enumValues)[number];
    sensitivity: (typeof schema.docSensitivityEnum.enumValues)[number];
    emergency?: boolean;
    by: string;
    daysAgo: number;
    lines: string[];
  }[] = [
    {
      title: 'Insurance card — MediCare Plus',
      category: 'insurance',
      sensitivity: 'standard',
      emergency: true,
      by: mariaM.id,
      daysAgo: 60,
      lines: ['Member: Antonio Santos', 'Member ID: MCP-4471-220', 'Plan: MediCare Plus (private top-up)', 'Hotline: +63 2 8555 0100', '', 'DEMO DOCUMENT — seeded sample, not a real policy.'],
    },
    {
      title: 'Current medication list',
      category: 'medical',
      sensitivity: 'standard',
      emergency: true,
      by: graceM.id,
      daysAgo: 6,
      lines: ['Lisinopril 10mg — 8:00 AM', 'Metformin 500mg — 8:00 AM / 8:00 PM', 'Vitamin D 1000 IU — 8:00 AM', 'Aspirin 81mg — 1:00 PM', 'Atorvastatin 20mg — 8:00 PM', 'Donepezil 10mg — 9:30 PM', '', 'Allergy: Penicillin. DEMO DOCUMENT.'],
    },
    {
      title: 'Blood panel results — HiPrecision',
      category: 'medical',
      sensitivity: 'sensitive',
      by: graceM.id,
      daysAgo: 7,
      lines: ['Fasting blood panel', 'HbA1c: 7.1% (prior 7.4%)', 'LDL: 96 mg/dL · HDL: 48 mg/dL', 'Creatinine: 1.0 mg/dL', '', 'DEMO DOCUMENT — seeded sample.'],
    },
    {
      title: 'Advance directive & healthcare proxy',
      category: 'advance-directive',
      sensitivity: 'sensitive',
      emergency: true,
      by: mariaM.id,
      daysAgo: 90,
      lines: ['Healthcare proxy: Maria Santos (daughter)', 'Resuscitation: full code', 'Signed: notarized copy on file', '', 'DEMO DOCUMENT — seeded sample.'],
    },
    {
      title: 'Power of attorney (notarized)',
      category: 'legal',
      sensitivity: 'restricted',
      by: mariaM.id,
      daysAgo: 90,
      lines: ['Durable power of attorney', 'Principal: Antonio Santos', 'Agent: Maria Santos', '', 'RESTRICTED — visible to coordinators only.', 'DEMO DOCUMENT — seeded sample.'],
    },
    {
      title: 'Bank authorization letter — BPI',
      category: 'financial',
      sensitivity: 'restricted',
      by: mariaM.id,
      daysAgo: 45,
      lines: ['Authorization for account inquiries', 'Account holder: Antonio Santos', 'Authorized: Maria Santos', '', 'RESTRICTED — visible to coordinators only.', 'DEMO DOCUMENT — seeded sample.'],
    },
  ];
  const docRows: (typeof schema.documents.$inferInsert)[] = [];
  for (const d of docDefs) {
    const { key, size } = await uploadDemoPdf(circle.id, d.title, d.lines);
    docRows.push({
      circleId: circle.id,
      title: d.title,
      category: d.category,
      sensitivity: d.sensitivity,
      kind: 'pdf',
      s3Key: key,
      contentType: 'application/pdf',
      fileName: `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
      sizeBytes: size,
      isEmergencyVisible: d.emergency ?? false,
      uploadedByMembershipId: d.by,
      createdAt: daysAgoAt(d.daysAgo, 11, 0),
    });
  }
  await db.insert(schema.documents).values(docRows);

  // ---------------------------------------------------------------------------
  // Incident: the fall, 12 days ago — reported by Grace, escalated, resolved by
  // Maria the next day. Acks + comments show the escalation loop closing.
  // ---------------------------------------------------------------------------
  const [fallEvent] = await db
    .insert(schema.timelineEvent)
    .values({
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'incident',
      summary: 'Grace reported a fall — Antonio slipped getting out of the shower. No head impact; sore left hip.',
      isUrgent: true,
      occurredAt: daysAgoAt(12, 7, 40),
    })
    .returning({ id: schema.timelineEvent.id });
  const [fall] = await db
    .insert(schema.incident)
    .values({
      circleId: circle.id,
      type: 'fall',
      severity: 'medium',
      description:
        'Antonio slipped getting out of the shower around 7:30 AM. He did not hit his head; sore left hip but bearing weight. Helped him to a chair, applied a cold pack, BP 131/84 afterwards. He says the floor mat moved.',
      occurredAt: daysAgoAt(12, 7, 30),
      status: 'resolved',
      reportedByMembershipId: graceM.id,
      timelineEventId: fallEvent.id,
      resolutionNote:
        'Saw Dr. Chen by phone — bruising only, no imaging needed. New non-slip mat installed; grab-bar quotes in progress (see task). Watch the hip for a week.',
      resolvedAt: daysAgoAt(11, 10, 0),
      resolvedByMembershipId: mariaM.id,
    })
    .returning({ id: schema.incident.id });
  await db.insert(schema.incidentNotification).values([
    { circleId: circle.id, incidentId: fall.id, membershipId: mariaM.id, status: 'acknowledged', acknowledgedAt: daysAgoAt(12, 7, 48) },
    { circleId: circle.id, incidentId: fall.id, membershipId: paoloM.id, status: 'acknowledged', acknowledgedAt: daysAgoAt(12, 8, 5) },
    { circleId: circle.id, incidentId: fall.id, membershipId: rosaM.id, status: 'seen' },
  ]);
  await db.insert(schema.incidentComment).values([
    { circleId: circle.id, incidentId: fall.id, authorMembershipId: mariaM.id, body: 'Calling Dr. Chen now. Grace, thank you for the quick report and the cold pack.' },
    { circleId: circle.id, incidentId: fall.id, authorMembershipId: paoloM.id, body: 'Ordering a non-slip mat and looking at grab bars today. He scared me.' },
    { circleId: circle.id, incidentId: fall.id, authorMembershipId: graceM.id, body: 'He is resting and joking again. Hip is bruised but he walked to lunch with the cane.' },
  ]);

  // ---------------------------------------------------------------------------
  // Timeline: three weeks of daily life so the feed scrolls like a real circle.
  // ---------------------------------------------------------------------------
  const graceNotes = [
    'Antonio ate a good breakfast and walked 15 minutes in the garden.',
    'Quiet morning. He hummed along to his boleros while I prepped lunch.',
    'A bit tired today — skipped the walk, did the balance exercises instead.',
    'Good spirits! He told the story about the fishing trip in Batangas again.',
    'Appetite a little low at lunch; he finished the soup at least.',
    'We watered the plants together. He was steady on the cane the whole time.',
    'Morning walk done, 18 minutes — his best this month.',
    'He asked about Paolo today. We watched the video from Dubai twice.',
    'Slight knee complaint after the walk; cold pack helped, no swelling.',
    'Mass on TV, then a nap. Calm, content day.',
  ];
  type TlRow = typeof schema.timelineEvent.$inferInsert;
  const tl: TlRow[] = [];
  for (let d = 21; d >= 1; d--) {
    if (d === 12) continue; // the fall day already has its incident event
    tl.push({
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'note',
      summary: 'Grace added a note',
      payload: { body: graceNotes[d % graceNotes.length] },
      occurredAt: daysAgoAt(d, 11, 15),
    });
  }
  tl.push(
    // The cardiologist visit + lab on the feed (postedToTimeline).
    {
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'appointment',
      summary: 'Cardiology check-up with Dr. Chen completed — Lisinopril unchanged, recheck in 4 weeks.',
      refType: 'appointment',
      refId: apptRows[0].id,
      occurredAt: daysAgoAt(20, 11, 0),
    },
    {
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'appointment',
      summary: 'Blood panel done — HbA1c improved to 7.1%. Results in Documents.',
      refType: 'appointment',
      refId: apptRows[1].id,
      occurredAt: daysAgoAt(8, 9, 0),
    },
    {
      circleId: circle.id,
      actorMembershipId: paoloM.id,
      eventType: 'task',
      summary: 'Paolo booked the cardiology follow-up for next week.',
      occurredAt: daysAgoAt(4, 19, 30),
    },
    {
      circleId: circle.id,
      actorMembershipId: graceM.id,
      eventType: 'vital',
      summary: 'Blood pressure 136/86 — a little high this morning, logged for Dr. Chen.',
      occurredAt: daysAgoAt(1, 8, 35),
    },
    // Today.
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
  );
  const timelineRows = await db.insert(schema.timelineEvent).values(tl).returning({ id: schema.timelineEvent.id });

  // Demo comments + reactions on today's medication event, so the feed shows conversation.
  const medEventId = timelineRows[timelineRows.length - 6].id;
  await db.insert(schema.timelineComment).values([
    { circleId: circle.id, timelineEventId: medEventId, authorMembershipId: mariaM.id, body: 'Thanks Grace! Did he take it with food?' },
    { circleId: circle.id, timelineEventId: medEventId, authorMembershipId: graceM.id, body: 'Yes, he had toast and juice first.' },
  ]);
  await db.insert(schema.timelineReaction).values([
    { circleId: circle.id, timelineEventId: medEventId, membershipId: mariaM.id },
    { circleId: circle.id, timelineEventId: medEventId, membershipId: paoloM.id },
  ]);

  // ---------------------------------------------------------------------------
  // Daily digests: five past days pre-written (deterministic — no Bedrock call at
  // seed time) so the digest screen has history; today stays empty for the live
  // "generate" demo beat.
  // ---------------------------------------------------------------------------
  const digestDays: { d: number; mood: (typeof schema.digestMoodEnum.enumValues)[number]; emoji: string; headline: string; paras: string[] }[] = [
    {
      d: 1,
      mood: 'good',
      emoji: '🌤️',
      headline: 'Steady, with one watch item',
      paras: [
        "Antonio had a steady day. Grace was there for the morning routine — all three 8 AM medications were taken with breakfast, and they got a short walk in before the heat.",
        "One thing to keep an eye on: his morning blood pressure read 136/86, a little above his usual. It's logged for Dr. Chen ahead of next week's follow-up. Everything else — meals, mood, the evening Donepezil he takes himself — went smoothly.",
      ],
    },
    {
      d: 2,
      mood: 'good',
      emoji: '🌿',
      headline: 'Garden time and a full plate',
      paras: [
        'A genuinely good day. Antonio finished every meal, walked in the garden with Grace, and Maria handled the weekly groceries with the low-sodium list.',
        'All scheduled doses were given on time. Grace picked up the Metformin refill, so supply is healthy again.',
      ],
    },
    {
      d: 3,
      mood: 'okay',
      emoji: '🫖',
      headline: 'A quieter, slower day',
      paras: [
        'Antonio was a bit tired today and skipped the walk; Grace did the seated balance exercises with him instead. Appetite was lighter at lunch, though he finished his soup.',
        'Medications all on schedule. Paolo ordered new batteries for the BP cuff so the morning readings keep flowing.',
      ],
    },
    {
      d: 4,
      mood: 'good',
      emoji: '📞',
      headline: 'Follow-up booked, spirits up',
      paras: [
        "Paolo booked the cardiology follow-up with Dr. Chen for next week — one less thing on Maria's plate. Antonio was in good spirits and told the Batangas fishing story again, which Grace reports is always a good sign.",
        'Doses on time, blood pressure in his usual range this morning.',
      ],
    },
    {
      d: 5,
      mood: 'great',
      emoji: '🌞',
      headline: 'His best walk this month',
      paras: [
        'A bright one: 18 minutes in the garden — his best walk this month — plus a long video call with Paolo in Dubai. He hummed boleros through lunch prep.',
        'Everything clinical was routine: all medications taken, morning readings normal.',
      ],
    },
  ];
  await db.insert(schema.dailyDigest).values(
    digestDays.map((g) => ({
      circleId: circle.id,
      digestDate: dateStr(daysAgoAt(g.d, 12, 0)),
      headline: g.headline,
      emoji: g.emoji,
      mood: g.mood,
      paragraphs: g.paras,
      stats: [
        { key: 'meds', label: 'Doses given', value: '7' },
        { key: 'bp', label: 'Blood pressure', value: g.d === 1 ? '136/86' : '126/80' },
        { key: 'sleep', label: 'Sleep', value: '7.2h' },
        { key: 'mood', label: 'Mood', value: g.mood === 'great' ? 'Great' : g.mood === 'good' ? 'Good' : 'Okay' },
      ],
      sources: [
        { id: 'src-0', type: 'med', label: 'Lisinopril given', time: '8:04 AM' },
        { id: 'src-1', type: 'vital', label: `Blood pressure ${g.d === 1 ? '136/86' : '126/80'}`, time: '8:30 AM' },
        { id: 'src-2', type: 'note', label: 'Grace added a note', time: '11:15 AM' },
      ],
      model: 'seed',
      generatedByMembershipId: mariaM.id,
      createdAt: daysAgoAt(g.d, 20, 5),
    })),
  );

  // ---------------------------------------------------------------------------
  // Billing: the Plus plan paid by card — Settings → Billing renders a real history.
  // (Only brand/last4/expiry are ever stored — what a tokenizing processor returns.)
  // ---------------------------------------------------------------------------
  await db.insert(schema.paymentMethod).values({
    circleId: circle.id,
    brand: 'visa',
    last4: '4242',
    expMonth: 8,
    expYear: 2028,
    isDefault: true,
    addedByMembershipId: mariaM.id,
  });
  await db.insert(schema.invoice).values(
    [3, 2, 1].map((monthsAgo, i) => ({
      circleId: circle.id,
      number: `INV-2026-${String(4 + i).padStart(3, '0')}`,
      amountCents: 1200,
      currency: 'usd',
      status: 'paid',
      issuedAt: daysAgoAt(monthsAgo * 30, 9, 0),
    })),
  );

  // ---------------------------------------------------------------------------
  // Emergency-card share: a LIVE public /e/<token> link (72h, like the app creates)
  // so every persona sees the printed QR immediately and judges can scan it.
  // ---------------------------------------------------------------------------
  const shareToken = randomBytes(32).toString('base64url');
  await db.insert(schema.emergencyCardShare).values({
    circleId: circle.id,
    token: shareToken,
    createdByMembershipId: mariaM.id,
    expiresAt: daysAheadAt(3, 12, 0),
  });

  // ---------------------------------------------------------------------------
  // Audit trail: believable history in the append-only ledger.
  // ---------------------------------------------------------------------------
  await db.insert(schema.auditLog).values([
    { circleId: circle.id, actorUserId: maria.id, actorMembershipId: mariaM.id, action: 'create', entityType: 'circle', summary: 'Created the care circle', occurredAt: daysAgoAt(90, 9, 0) },
    { circleId: circle.id, actorUserId: maria.id, actorMembershipId: mariaM.id, action: 'invite', entityType: 'membership', summary: 'Invited Grace Reyes as caregiver', occurredAt: daysAgoAt(88, 10, 0) },
    { circleId: circle.id, actorUserId: maria.id, actorMembershipId: mariaM.id, action: 'create', entityType: 'document', summary: 'Uploaded a restricted legal document', occurredAt: daysAgoAt(90, 11, 5) },
    { circleId: circle.id, actorUserId: grace.id, actorMembershipId: graceM.id, action: 'create', entityType: 'document', summary: 'Uploaded blood panel results', occurredAt: daysAgoAt(7, 9, 30) },
    { circleId: circle.id, actorUserId: grace.id, actorMembershipId: graceM.id, action: 'create', entityType: 'incident', entityId: fall.id, summary: 'Reported a fall (medium severity)', occurredAt: daysAgoAt(12, 7, 41) },
    { circleId: circle.id, actorUserId: maria.id, actorMembershipId: mariaM.id, action: 'update', entityType: 'incident', entityId: fall.id, summary: 'Resolved the fall incident', occurredAt: daysAgoAt(11, 10, 0) },
    { circleId: circle.id, actorUserId: maria.id, actorMembershipId: mariaM.id, action: 'export', entityType: 'emergency_card', summary: 'Viewed/printed the emergency card', occurredAt: daysAgoAt(11, 10, 20) },
    { circleId: circle.id, actorUserId: paolo.id, actorMembershipId: paoloM.id, action: 'update', entityType: 'task', summary: 'Completed: Book the cardiology follow-up', occurredAt: daysAgoAt(4, 19, 30) },
  ]);

  console.log('\nSeed complete.');
  console.log("  Circle id:         ", circle.id, "(Antonio's Care)");
  console.log('  Owner user (Maria):', maria.id);
  console.log(`  Demo PDFs uploaded to S3: ${uploadedPdfs}/${docDefs.length}${uploadedPdfs === 0 ? '  (set S3_BUCKET + AWS creds to upload real files)' : ''}`);
  console.log('  Tip: set app.current_user_id to a user id to test RLS by hand.');
  console.log('  Tip: POST /api/ingest (as the platform admin) to embed the record for Ask Kintwadi.');
  console.log(`  Emergency-card public link (72h, what the printed QR encodes):  /e/${shareToken}`);
  console.log('\nDemo sign-in credentials (email / password):');
  console.log(`  Coordinator     maria@kintwadi.demo    ${DEMO_PASSWORD}`);
  console.log(`  Remote family   paolo@kintwadi.demo    ${DEMO_PASSWORD}`);
  console.log(`  Caregiver       grace@kintwadi.demo    ${DEMO_PASSWORD}   (digest in Tagalog)`);
  console.log(`  Care recipient  antonio@kintwadi.demo  ${DEMO_PASSWORD}`);
  console.log(`  Read-only       rosa@kintwadi.demo     ${DEMO_PASSWORD}`);
  console.log(`  Clinician       chen@kintwadi.demo     ${DEMO_PASSWORD}   (read-mostly clinical view)`);
  console.log(`  Platform admin  admin@kintwadi.demo    ${DEMO_PASSWORD}   (→ /admin)`);

  await client.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
