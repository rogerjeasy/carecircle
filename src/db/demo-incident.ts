/**
 * Insert a demo urgent/incident timeline event so you can watch the admin console's live Safety
 * feed update in real time (via the kintwadi_safety NOTIFY trigger). Dev/demo only.
 *
 * Run:  npm run db:demo-incident
 *       npm run db:demo-incident -- "Blood pressure spiked 4 readings"   (custom summary)
 *
 * Inserts into the first care circle, as the ADMIN connection (matches seed.ts).
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error('Set MIGRATION_DATABASE_URL (admin) or DATABASE_URL first.');
}

const summary = process.argv.slice(2).join(' ').trim() || 'Fall logged — escalation in progress';
const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  const [circle] = await sql`select id, name from care_circle order by created_at limit 1`;
  if (!circle) {
    console.error('No care circle found — run `npm run db:seed` first.');
    await sql.end();
    process.exit(1);
  }

  const [row] = await sql`
    insert into timeline_event (circle_id, event_type, summary, is_urgent)
    values (${circle.id}, 'incident', ${summary}, true)
    returning id
  `;

  console.log(`✅ Inserted urgent incident ${row.id} into "${circle.name}".`);
  console.log('   → If /admin/system is open, the Safety alerts panel should update instantly.');
  await sql.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
