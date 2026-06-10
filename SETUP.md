# CareCircle — Setup & Provisioning Guide

Everything needed to take this repo from zero to a running full-stack app on **Aurora PostgreSQL + Vercel**. Steps you (the human) must do are marked 👤 — they need your AWS/Vercel accounts and can't be automated.

---

## What's already built (by Claude Code)

- Next.js 16 (App Router, TS, Tailwind v4) app, deps installed.
- **Drizzle schema** (`src/db/schema/`) + two migrations in `drizzle/`:
  - `0000_init.sql` — tables (Auth.js + core domain: care_circle, membership, care_recipient_profile, timeline_event, audit_log).
  - `0001_rls_policies.sql` — **Row-Level Security**: tenant isolation, private-note visibility, append-only audit log, via SECURITY DEFINER helpers.
- **Auth.js v5** (`src/auth.ts`, route handler, `proxy.ts` for Next 16) with the Drizzle adapter.
- **Full auth flows wired** (not mocks): email/password sign-up + sign-in (Credentials provider,
  `scrypt` hashing in `src/lib/password.ts`), **Google** and **Apple** social sign-in (env-gated),
  and **forgot/reset password** (one-time hashed tokens + Resend email). Server actions live in
  `src/lib/auth/actions.ts`; migration `0002` adds `user.password_hash` + `password_reset_token`.
- **RLS bridge**: `withUserContext()` / `withAuthedDb()` set `app.current_user_id` per request (`src/db/rls.ts`, `src/db/dal.ts`).
- **Seed** script with the Antonio/Maria/Paolo/Grace demo data (`src/db/seed.ts`). Demo accounts
  share the password **`CareCircle123`** (e.g. `maria@carecircle.demo`) so you can sign in immediately.

---

## 1. 👤 Request hackathon credits (do first — deadline matters)

Request the **$100 AWS + $30 v0** credits from the hackathon page. **The AWS form closes June 26, 12:00pm PT.** Don't block on this to start, but do it today.

## 2. 👤 Provision Aurora PostgreSQL

**Recommended: Vercel Marketplace (simplest, and gives you the submission screenshot).**

1. Create a Vercel project (push this `carecircle/` repo to GitHub, then "Import" it in Vercel — or `vercel link`).
2. In the Vercel dashboard → your project → **Storage** → **Marketplace** → choose **Aurora (AWS)** → create an **Aurora PostgreSQL Serverless v2** database.
3. Vercel injects a connection string into the project's env (the **admin/owner** connection).
4. 📸 **Screenshot the Storage / configuration page** showing the AWS database — this is a required submission artifact (proof of AWS DB usage).

*Alternative:* create the Aurora cluster in the AWS Console (RDS → Create database → Aurora PostgreSQL → Serverless v2), enable a public endpoint for local dev, and grab the connection string.

## 3. 👤 Create the least-privilege app role (this is what makes RLS real)

The app must connect as a **non-owner** role so RLS actually applies. Open a SQL console against your database (RDS Query Editor, or `psql` with the admin string) and run:

```sql
-- Run as the admin/owner user. Choose a strong password.
create role carecircle_app with login password 'CHANGE_ME_strong_password';
grant connect on database "<your_db_name>" to carecircle_app;
grant usage on schema public to carecircle_app;
-- (Run the two GRANTs below again AFTER step 5 migrations, or rely on default privileges.)
grant select, insert, update, delete on all tables in schema public to carecircle_app;
grant usage, select on all sequences in schema public to carecircle_app;
alter default privileges in schema public grant select, insert, update, delete on tables to carecircle_app;
alter default privileges in schema public grant usage, select on sequences to carecircle_app;
```

> Why: with FORCE-free RLS, the table **owner bypasses** policies (good for migrations/seed) while the **app role is subject** to them (good for the running app). This is the textbook, Aurora-friendly pattern — and a great point to make in your demo.

## 4. 👤 Configure environment

```bash
cp .env.example .env
npx auth secret        # writes AUTH_SECRET (or set it manually)
```

Set both URLs in `.env` (see `.env.example` for the shape):

- `MIGRATION_DATABASE_URL` → the **admin/owner** connection (from step 2).
- `DATABASE_URL` → the **carecircle_app** connection (admin host/db, but user `carecircle_app` + its password).

Optional providers/services (the app runs without them — see `.env.example` for the full shape):
- **Google sign-in:** set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (button shows automatically).
- **Apple sign-in:** set `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` (needs a paid Apple Developer account)
  and `NEXT_PUBLIC_AUTH_APPLE_ENABLED="true"` to reveal the button.
- **Password-reset emails:** set `RESEND_API_KEY` (+ a verified `EMAIL_FROM`). If unset, reset links
  are printed to the server console so the flow still works end-to-end in local dev.
- **Ask CareCircle (RAG):** all on AWS — see step 4a below.

### 4a. 👤 Ask CareCircle (RAG) — Amazon Bedrock + Aurora pgvector

"Ask CareCircle" embeds the record with **Bedrock Titan**, stores vectors **in Aurora** (`rag_chunk`,
via the `pgvector` extension), retrieves them under RLS, and answers with **Claude on Bedrock**. It
needs only AWS — no external vector DB or API keys.

1. **Enable model access** in the Bedrock console (region must match `AWS_REGION`, e.g. us-east-1):
   - **Claude Sonnet 4.5** (generation) — first-time use needs the one-time "use case details" form.
   - **Titan Text Embeddings v2** (embeddings).
2. **IAM:** the credentials in `.env` need `bedrock:InvokeModel` on BOTH the Titan model and the
   Claude inference profile (cross-region profiles span us-east-1/us-east-2/us-west-2 — allow
   `arn:aws:bedrock:*::foundation-model/...` + the `inference-profile/us.anthropic...` ARN).
3. **`.env`** (see `.env.example`): `AWS_REGION` + AWS creds, and
   `BEDROCK_MODEL_ID="us.anthropic.claude-sonnet-4-5-20250929-v1:0"` (the inference-profile id —
   copy the exact one from the Bedrock console). `BEDROCK_EMBED_MODEL_ID` defaults to
   `amazon.titan-embed-text-v2:0`.
4. **pgvector:** `npm run db:migrate` (step 5) runs `CREATE EXTENSION IF NOT EXISTS vector` as the
   admin connection and creates the `rag_chunk` table + HNSW index. On Aurora the master user can
   create the extension; if it errors, ensure your engine version supports pgvector.
5. **Backfill existing records** into the index once (signed in as a platform admin):
   `curl -X POST http://localhost:3000/api/ingest -H "Content-Type: application/json" -d "{}"`.
   New documents/timeline posts index automatically on write.

## 5. Run migrations + seed

```bash
npm run db:migrate     # creates tables + RLS policies (runs as admin); also CREATE EXTENSION vector + rag_chunk
# (re-run the two GRANT statements from step 3 now, so carecircle_app can see the new tables)
npm run db:seed        # inserts the demo circle; prints the owner user id
```

## 6. Run it

```bash
npm run dev            # http://localhost:3000
```

## 7. ✅ Verify RLS actually works (the money check)

Connect **as `carecircle_app`** (psql or Studio) and run:

```sql
-- No user context yet -> tenant tables return ZERO rows (RLS denies by default):
select count(*) from timeline_event;          -- expect 0

-- Set the signed-in user (use the owner id printed by the seed), then you see the circle:
select set_config('app.current_user_id', '<MARIA_USER_ID>', false);
select count(*) from timeline_event;          -- expect 5
select name from care_circle;                 -- "Antonio's Care"
```

If counts are 0 without context and non-zero with it, **RLS is enforcing** — exactly the behavior to show judges. (`npm run db:studio` opens Drizzle Studio if you prefer a GUI; connect it with the app role to feel the isolation.)

## 8. 👤 Deploy to Vercel

- Add `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` (your `*.vercel.app`), `CRON_SECRET`, and any Google keys under **Project → Settings → Environment Variables**.
- Push to GitHub; Vercel builds and deploys (the two cron jobs in `vercel.json` — digest + care scans — start firing automatically with `Authorization: Bearer $CRON_SECRET`). Grab your **Vercel Team ID** (Settings → General) for the submission.

### 8a. 👤 Vercel OIDC → AWS (keyless production credentials — recommended)

Production needs **no stored AWS keys**: every AWS client resolves credentials through
`src/lib/aws/credentials.ts`, which exchanges Vercel's per-invocation OIDC token for short-lived
STS credentials when `AWS_ROLE_ARN` is set (and falls back to the standard chain locally).

1. **Vercel:** Project → Settings → **OpenID Connect** — note the team's issuer URL
   (`https://oidc.vercel.com/<team-slug>`) and audience.
2. **AWS IAM → Identity providers → Add provider:** type *OpenID Connect*, the issuer URL above,
   audience `https://vercel.com/<team-slug>`.
3. **Create a role** trusting that provider, with a condition pinning `sub` to this project, e.g.
   `"oidc.vercel.com/<team-slug>:sub": "owner:<team-slug>:project:carecircle:environment:production"`.
   Attach least-privilege policies only: `bedrock:InvokeModel` (Titan + the Claude inference
   profile), S3 read/write on the uploads bucket, `ses:SendEmail`, `sns:Publish`.
4. **Vercel env:** set `AWS_ROLE_ARN` to the role's ARN — and delete
   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` from the project.

Local dev keeps using a static least-privilege key pair in `.env` (the SDK default chain).

## 9. Next build steps (Day 4+ of the plan)

Wire the v0 screens (from `../prompts/`) to this data through `withAuthedDb()`, then add the medication tables + the **atomic give-a-med transaction**, documents + sensitivity RLS, and the Bedrock Daily Digest. Claude Code can do each of these with you.

---

### Troubleshooting

- **App shows no data / everything empty:** you're connected as `carecircle_app` but `app.current_user_id` isn't set — make sure reads go through `withAuthedDb()` (which sets it) and that you're signed in.
- **Migrations fail with permission errors:** `MIGRATION_DATABASE_URL` must be the **admin/owner**, not `carecircle_app`.
- **`carecircle_app` sees nothing even with context:** re-run the GRANTs from step 3 after migrating (new tables need grants).
- **SSL error connecting to Aurora:** keep `?sslmode=require` in the URL.
