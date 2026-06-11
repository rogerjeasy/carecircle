// One-off diagnostic: is the demo seed present in the database DATABASE_URL points at?
// Read-only. Run: node scripts/check-demo-data.mjs
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });

try {
  const users = await sql`
    select email, password_hash is not null as has_pw
    from "user" where email like '%@carecircle.demo' order by email`;
  console.log('demo users:', users.length);
  for (const u of users) console.log(' ', u.email, 'pw:', u.has_pw);

  // Scoped to the DEMO circle only — this runs on the privileged connection, and
  // a diagnostic must never dump other tenants' data (see AGENTS.md → platform super-admin).
  const [demo] = await sql`
    select c.id, c.name, c.plan from care_circle c
    join membership m on m.circle_id = c.id
    join "user" u on u.id = m.user_id
    where u.email = 'maria@carecircle.demo' limit 1`;
  if (!demo) {
    console.log('demo circle: NOT FOUND (run npm run db:seed)');
  } else {
    console.log('demo circle:', `${demo.name} (plan: ${demo.plan})`);
    const counts = await sql`
      select (select count(*)::int from medication where circle_id = ${demo.id}) as meds,
             (select count(*)::int from timeline_event where circle_id = ${demo.id}) as events,
             (select count(*)::int from rag_chunk where circle_id = ${demo.id}) as chunks,
             (select count(*)::int from daily_digest where circle_id = ${demo.id}) as digests,
             (select count(*)::int from emergency_card_share
                where circle_id = ${demo.id} and revoked_at is null and expires_at > now()) as live_share_links`;
    console.log('demo-circle counts:', JSON.stringify(counts[0]));
    if (counts[0].chunks === 0) console.log('  ⚠ rag_chunk is empty — POST /api/ingest (as platform admin) so Ask CareCircle has vectors.');
  }
} catch (e) {
  console.error('ERR', e.code ?? '', e.message);
} finally {
  await sql.end();
}
