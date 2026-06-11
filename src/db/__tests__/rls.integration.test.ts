/**
 * RLS integration test — proves Aurora Row-Level Security ENFORCES tenant isolation and the
 * sensitivity tiers, at the database layer, exactly as the app relies on.
 *
 * This is the real guarantee behind CareCircle's security story: not "the app checks a role" but
 * "the database refuses to return rows the caller may not see." It therefore needs a real Postgres
 * (with the `vector` extension). It self-SKIPS unless `TEST_DATABASE_URL` points at a THROWAWAY
 * database — the run will `DROP SCHEMA public CASCADE`, so never aim it at anything you value.
 *
 *   TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/carecircle_test" npm test
 *
 * No AWS is used: embeddings are written as literal vectors, so nothing calls Bedrock.
 *
 * What it asserts (connected AS the least-privilege `carecircle_app` role, the same role the running
 * app uses, which is SUBJECT to the policies):
 *   1. No signed-in user  → 0 rows (fail-closed).
 *   2. Cross-tenant       → a member of circle A sees none of circle B's rows, and vice-versa.
 *   3. Sensitivity tiers  → for rag_chunk retrieval (the Ask CareCircle vector store):
 *        • read_only      sees only `standard`
 *        • caregiver      sees `standard` + `sensitive`, never `restricted`
 *        • family/owner   see all three
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';

const ADMIN_URL = process.env.TEST_DATABASE_URL;
const RUN = Boolean(ADMIN_URL);

const DRIZZLE_DIR = path.resolve(__dirname, '../../../drizzle');
const APP_ROLE = 'carecircle_app';
const APP_PASSWORD = 'rls_test_' + randomUUID().replace(/-/g, '');
const EMBED_DIM = 1024;

// A non-zero unit-ish vector literal (cosine distance is well-defined; we don't rely on ranking).
const VECTOR_LITERAL = `[${['1', ...Array(EMBED_DIM - 1).fill('0')].join(',')}]`;

/** Ids for the fixture so assertions can reference them. */
const ids = {
  circleA: randomUUID(),
  circleB: randomUUID(),
  userOwnerA: randomUUID(),
  userFamilyA: randomUUID(),
  userCaregiverA: randomUUID(),
  userReadonlyA: randomUUID(),
  userOwnerB: randomUUID(),
};

let admin: ReturnType<typeof postgres>;
let app: ReturnType<typeof postgres>;

/** Apply every drizzle/*.sql migration in order (split on drizzle's statement-breakpoint marker). */
async function applyMigrations(sqlClient: ReturnType<typeof postgres>) {
  const files = readdirSync(DRIZZLE_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
  for (const file of files) {
    const raw = readFileSync(path.join(DRIZZLE_DIR, file), 'utf8');
    for (const chunk of raw.split('--> statement-breakpoint')) {
      const stmt = chunk.trim();
      if (!stmt) continue;
      await sqlClient.unsafe(stmt);
    }
  }
}

/** Insert a rag_chunk in a circle with a given sensitivity. Admin connection bypasses RLS. */
async function insertChunk(circleId: string, sensitivity: 'standard' | 'sensitive' | 'restricted') {
  await admin.unsafe(
    `insert into rag_chunk
       (circle_id, source, source_id, sensitivity, title, chunk_index, chunk_count, content, embedding, source_created_at)
     values ($1, 'document', $2, $3, $4, 0, 1, $5, $6::vector, now())`,
    [circleId, randomUUID(), sensitivity, `${sensitivity} doc`, `content ${sensitivity}`, VECTOR_LITERAL],
  );
}

/** Run a query as a given signed-in user (RLS context), or with no user when userId is null. */
async function asUser<T>(userId: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return app.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${userId ?? ''}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/** The sensitivity tiers of rag_chunks the given user can SELECT, in a circle. */
async function visibleTiers(userId: string, circleId: string): Promise<string[]> {
  return asUser(userId, async (tx) => {
    const rows = await tx<{ sensitivity: string }[]>`
      select sensitivity from rag_chunk where circle_id = ${circleId} order by sensitivity`;
    return rows.map((r) => r.sensitivity).sort();
  });
}

beforeAll(async () => {
  if (!RUN) return;

  admin = postgres(ADMIN_URL!, { prepare: false, max: 1, onnotice: () => {} });

  // Clean slate (THROWAWAY database only).
  await admin.unsafe('drop schema if exists public cascade');
  await admin.unsafe('create schema public');

  await applyMigrations(admin);

  // Least-privilege app role + grants (mirrors src/db/setup-app-role.ts).
  await admin.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
        CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}';
      ELSE
        ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}';
      END IF;
    END $$;
  `);
  for (const stmt of [
    `GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`,
  ]) {
    await admin.unsafe(stmt);
  }

  // --- Seed (admin bypasses RLS) ---
  await admin.unsafe(
    `insert into "user" (id, email) values
      ($1,$2),($3,$4),($5,$6),($7,$8),($9,$10)`,
    [
      ids.userOwnerA, `owner-a-${ids.userOwnerA}@test.local`,
      ids.userFamilyA, `family-a-${ids.userFamilyA}@test.local`,
      ids.userCaregiverA, `caregiver-a-${ids.userCaregiverA}@test.local`,
      ids.userReadonlyA, `readonly-a-${ids.userReadonlyA}@test.local`,
      ids.userOwnerB, `owner-b-${ids.userOwnerB}@test.local`,
    ],
  );
  await admin.unsafe(`insert into care_circle (id, name) values ($1,'Circle A'),($2,'Circle B')`, [
    ids.circleA,
    ids.circleB,
  ]);
  await admin.unsafe(
    `insert into membership (circle_id, user_id, role, status) values
      ($1,$2,'owner','active'),
      ($1,$3,'family','active'),
      ($1,$4,'caregiver','active'),
      ($1,$5,'read_only','active'),
      ($6,$7,'owner','active')`,
    [ids.circleA, ids.userOwnerA, ids.userFamilyA, ids.userCaregiverA, ids.userReadonlyA, ids.circleB, ids.userOwnerB],
  );

  // Three tiers of rag_chunk in circle A; one standard chunk in circle B.
  await insertChunk(ids.circleA, 'standard');
  await insertChunk(ids.circleA, 'sensitive');
  await insertChunk(ids.circleA, 'restricted');
  await insertChunk(ids.circleB, 'standard');

  // A timeline event in each circle (for the cross-tenant assertion).
  await admin.unsafe(
    `insert into timeline_event (circle_id, event_type, summary) values
      ($1,'note','Circle A note'),($2,'note','Circle B note')`,
    [ids.circleA, ids.circleB],
  );

  // A health alert range in each circle (for the cross-tenant + manage-roles assertion).
  await admin.unsafe(
    `insert into health_alert_setting (circle_id, metric, enabled, min, max) values
      ($1,'hr',true,50,90),($2,'hr',true,55,95)`,
    [ids.circleA, ids.circleB],
  );

  // Connect AS the least-privilege role (subject to RLS).
  const appUrl = new URL(ADMIN_URL!);
  appUrl.username = APP_ROLE;
  appUrl.password = APP_PASSWORD;
  app = postgres(appUrl.toString(), { prepare: false, max: 1, onnotice: () => {} });
}, 60_000);

afterAll(async () => {
  await app?.end({ timeout: 5 });
  await admin?.end({ timeout: 5 });
});

describe.skipIf(!RUN)('Aurora RLS — DB-enforced tenant isolation', () => {
  it('returns NO rows when there is no signed-in user (fail-closed)', async () => {
    const chunks = await asUser(null, (tx) => tx`select count(*)::int as n from rag_chunk`);
    const events = await asUser(null, (tx) => tx`select count(*)::int as n from timeline_event`);
    expect(chunks[0].n).toBe(0);
    expect(events[0].n).toBe(0);
  });

  it('isolates tenants: circle A members see only circle A, circle B only circle B', async () => {
    // Owner A sees circle A's timeline event, not circle B's.
    const aEvents = await asUser(ids.userOwnerA, (tx) =>
      tx<{ summary: string }[]>`select summary from timeline_event`,
    );
    expect(aEvents.map((r) => r.summary)).toEqual(['Circle A note']);

    // Owner A sees circle A chunks, and ZERO rows scoped to circle B.
    const aSeesB = await asUser(ids.userOwnerA, (tx) =>
      tx<{ n: number }[]>`select count(*)::int as n from rag_chunk where circle_id = ${ids.circleB}`,
    );
    expect(aSeesB[0].n).toBe(0);

    // Owner B sees only circle B's event.
    const bEvents = await asUser(ids.userOwnerB, (tx) =>
      tx<{ summary: string }[]>`select summary from timeline_event`,
    );
    expect(bEvents.map((r) => r.summary)).toEqual(['Circle B note']);
  });

  it('enforces sensitivity tiers for rag_chunk retrieval (the Ask vector store)', async () => {
    // read-only relative: standard only.
    expect(await visibleTiers(ids.userReadonlyA, ids.circleA)).toEqual(['standard']);

    // caregiver: standard + sensitive, NEVER restricted.
    expect(await visibleTiers(ids.userCaregiverA, ids.circleA)).toEqual(['sensitive', 'standard']);

    // family + owner: all three tiers.
    expect(await visibleTiers(ids.userFamilyA, ids.circleA)).toEqual(['restricted', 'sensitive', 'standard']);
    expect(await visibleTiers(ids.userOwnerA, ids.circleA)).toEqual(['restricted', 'sensitive', 'standard']);
  });

  it('scopes health alert ranges per circle and limits edits to coordinators + family', async () => {
    // Tenant isolation: owner A sees exactly circle A's range.
    const aRows = await asUser(ids.userOwnerA, (tx) =>
      tx<{ circle_id: string; min: number }[]>`select circle_id, min from health_alert_setting`,
    );
    expect(aRows).toHaveLength(1);
    expect(aRows[0].circle_id).toBe(ids.circleA);

    // The caregiver may READ the ranges (they explain the status pills) but cannot edit them:
    // the manage policy's USING clause hides every row from their UPDATE, so 0 rows change.
    const updatedAsCaregiver = await asUser(ids.userCaregiverA, (tx) =>
      tx`update health_alert_setting set max = 200 where circle_id = ${ids.circleA}`,
    );
    expect(updatedAsCaregiver.count).toBe(0);

    // …and an INSERT is rejected outright by the WITH CHECK clause.
    await expect(
      asUser(ids.userCaregiverA, (tx) =>
        tx`insert into health_alert_setting (circle_id, metric, enabled, min, max)
           values (${ids.circleA}, 'glucose', true, 70, 140)`,
      ),
    ).rejects.toThrow();

    // A family member CAN edit (matches canManageAlertSettings + drizzle/0038).
    const updatedAsFamily = await asUser(ids.userFamilyA, (tx) =>
      tx`update health_alert_setting set max = 95 where circle_id = ${ids.circleA}`,
    );
    expect(updatedAsFamily.count).toBe(1);
  });

  it('scopes emergency-card share links per circle and limits create/revoke to coordinators', async () => {
    // Seed one live share link per circle (admin bypasses RLS).
    await admin.unsafe(
      `insert into emergency_card_share (circle_id, token, expires_at) values
        ($1, 'token-circle-a-${ids.circleA}', now() + interval '72 hours'),
        ($2, 'token-circle-b-${ids.circleB}', now() + interval '72 hours')`,
      [ids.circleA, ids.circleB],
    );

    // Tenant isolation: a circle A member sees only circle A's link.
    const aRows = await asUser(ids.userFamilyA, (tx) =>
      tx<{ circle_id: string }[]>`select circle_id from emergency_card_share`,
    );
    expect(aRows).toHaveLength(1);
    expect(aRows[0].circle_id).toBe(ids.circleA);

    // No session → no rows (fail-closed), so an anonymous caller can never enumerate tokens
    // through the app role; the public /e/<token> page goes through the privileged path instead.
    const anon = await asUser(null, (tx) => tx`select count(*)::int as n from emergency_card_share`);
    expect(anon[0].n).toBe(0);

    // A caregiver may SEE the link but cannot create one (WITH CHECK rejects the insert)…
    await expect(
      asUser(ids.userCaregiverA, (tx) =>
        tx`insert into emergency_card_share (circle_id, token, expires_at)
           values (${ids.circleA}, 'token-caregiver-attempt', now() + interval '1 hour')`,
      ),
    ).rejects.toThrow();

    // …nor revoke one (the manage policy hides every row from their UPDATE: 0 rows change).
    const revokedAsCaregiver = await asUser(ids.userCaregiverA, (tx) =>
      tx`update emergency_card_share set revoked_at = now() where circle_id = ${ids.circleA}`,
    );
    expect(revokedAsCaregiver.count).toBe(0);

    // The owner CAN revoke (matches the emergency-card MANAGE_ROLES + drizzle/0041).
    const revokedAsOwner = await asUser(ids.userOwnerA, (tx) =>
      tx`update emergency_card_share set revoked_at = now() where circle_id = ${ids.circleA}`,
    );
    expect(revokedAsOwner.count).toBe(1);
  });

  it('a read-only member cannot retrieve a restricted chunk even by similarity ordering', async () => {
    const rows = await asUser(ids.userReadonlyA, (tx) =>
      tx<{ sensitivity: string }[]>`
        select sensitivity from rag_chunk
        where circle_id = ${ids.circleA}
        order by embedding <=> ${VECTOR_LITERAL}::vector
        limit 8`,
    );
    expect(rows.some((r) => r.sensitivity === 'restricted')).toBe(false);
    expect(rows.some((r) => r.sensitivity === 'sensitive')).toBe(false);
  });
});
