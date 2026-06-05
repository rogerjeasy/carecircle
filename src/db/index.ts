/**
 * Database client (postgres.js + Drizzle) for Amazon Aurora PostgreSQL.
 *
 * IMPORTANT (Row-Level Security): the application connects as a role that is subject to
 * RLS. To read/write tenant data, go through `withUserContext()` / `withAuthedDb()`
 * (see ./rls.ts and ./dal.ts), which set the per-request `app.current_user_id` inside a
 * transaction so the RLS policies can scope every row to the current user's circles.
 *
 * The `db` exported here is the raw (unscoped) client — use it only for Auth.js adapter
 * tables and for migrations/seeds, never for ad-hoc tenant queries in request handlers.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL ?? '';

// `prepare: false` is recommended for serverless/poolers. One client per server instance.
export const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export type DB = typeof db;
