/**
 * Installs the Postgres LISTEN/NOTIFY plumbing that powers the admin console's live (push, not
 * polled) Safety-alerts feed.
 *
 * An AFTER INSERT trigger on `timeline_event` fires `pg_notify('carecircle_safety', <event id>)`
 * whenever an urgent or incident row is written. The SSE hub (src/lib/admin/live-hub.ts) holds a
 * single LISTEN connection and fans that out to every connected admin — so a new alert appears the
 * instant it's logged, with zero polling.
 *
 * Idempotent. Run as the admin connection:  npm run db:setup-notify
 */
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error('Set MIGRATION_DATABASE_URL (admin) or DATABASE_URL before running this.');
}

const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  console.log('Installing carecircle_safety NOTIFY trigger…');

  // The notify channel carries only the event id (payloads are capped at 8000 bytes and we don't
  // want PII in the channel anyway). The hub re-reads the alert through the audited path.
  await sql.unsafe(`
    create or replace function notify_safety_event() returns trigger
      language plpgsql
    as $$
    begin
      if NEW.is_urgent or NEW.event_type = 'incident' then
        perform pg_notify('carecircle_safety', NEW.id::text);
      end if;
      return NEW;
    end;
    $$;
  `);

  await sql.unsafe(`drop trigger if exists timeline_safety_notify on timeline_event;`);
  await sql.unsafe(`
    create trigger timeline_safety_notify
      after insert on timeline_event
      for each row execute function notify_safety_event();
  `);

  console.log('✅ Trigger installed. Urgent / incident timeline events now NOTIFY carecircle_safety.');
  await sql.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
