# CareCircle

> **One shared record for everyone caring for someone.**
> The calm, role-aware home for a family's caregiving — across siblings, cities, and time zones.

[![CI — lint, types, unit + RLS integration proof](https://github.com/rogerjeasy/carecircle/actions/workflows/ci.yml/badge.svg)](https://github.com/rogerjeasy/carecircle/actions/workflows/ci.yml)

Built for the **H0: Hack the Zero Stack** hackathon (AWS Databases + Vercel/v0). <br>
**Track:** Monetizable B2C (with a clear B2B expansion) · **Primary database:** **Amazon Aurora PostgreSQL (Serverless v2)** · **AI:** Amazon Bedrock (Claude + Titan) · **Frontend:** Next.js on **Vercel**.

---

## What it is

When an aging parent starts needing help, their care gets coordinated over chaotic group chats, sticky notes, and half-remembered phone calls — usually by one exhausted "default" child while siblings abroad feel guilty and out of the loop. Medications get missed or doubled. Nobody has the full picture.

**CareCircle is a single, shared, permission-aware care record** for a family and their helpers. Everyone — the local daughter, the brother in another country, the hired aide, even the parent — sees the right slice of one source of truth: today's meds, the care timeline, appointments, tasks, vitals, and documents. An AI **Daily Digest** turns a day of small care logs into a warm human update for the relative who couldn't be there, and **Ask CareCircle** answers natural-language questions grounded in the record — both running entirely on AWS.

---

## Which AWS database, and why

**Amazon Aurora PostgreSQL (Serverless v2)** is the primary back end — and it's a *thesis*, not a default. Caregiving is an inherently **relational, transactional, access-controlled** domain (people, roles, permissions, medications, administration events, appointments, vitals, documents, audit). That demands joins, referential integrity, and atomic transactions — exactly what a relational engine guarantees and a key-value store does not.

The deliberate architectural choices Aurora makes possible:

- **Row-Level Security (RLS) — RBAC enforced *in the database*.** A hired aide physically cannot read a financial document; a member of one family cannot read another's record. Tenancy is a single indexed `circle_id` check governed by Postgres policies (`drizzle/0001_rls_policies.sql` and the per-feature `*_rls.sql` migrations), not by trusting the UI. The app connects as a **least-privilege role** (`carecircle_app`) that is *subject* to RLS; only migrations/seed use the owner connection.
- **Atomic (ACID) medication safety.** "Give a medication" writes the administration event, decrements supply, appends a timeline entry, and writes the audit row in **one transaction** (`src/lib/medications/actions.ts` → `recordDose`).
- **Append-only audit log.** `audit_log` has no UPDATE/DELETE policy — medical-grade, immutable accountability.
- **`pgvector` in the same database powers "Ask CareCircle".** Documents, timeline events, and audit entries are chunked, embedded with **Amazon Bedrock Titan**, and stored as vectors in Aurora's `rag_chunk` table (HNSW cosine). Retrieval runs **inside the same RLS-scoped transaction**, so the similarity search inherits the *exact same* permission and sensitivity boundary as the documents vault — there is no second vector-store ACL to keep in sync. **Claude on Amazon Bedrock** (Converse API) then writes a grounded, cited answer, and that read is audited. *One database, relational and vector.*
- **Serverless v2** scales with load (and toward ~zero when idle); the roadmap notes a path to **Aurora DSQL** for multi-region strong consistency, because the families we serve are global.

The rest of the stack: **Next.js on Vercel** (Vercel Cron drives the nightly digest **and the daily care scans** — refill sweep, missed-dose reconciliation, decline alerts), **Amazon S3** (documents & photos), **Amazon SES/SNS** (email + urgent escalation), and **keyless AWS access in production** — Vercel's OIDC token is exchanged for short-lived STS credentials (`AWS_ROLE_ARN`), so no long-lived AWS keys are stored anywhere. Infrastructure is defined in Terraform under [`infra/`](./infra).

A full diagram + component legend lives in [`docs/architecture.md`](./docs/architecture.md) (editable source: [`docs/CareCircle-Architecture.drawio`](./docs/CareCircle-Architecture.drawio)); the data model is documented in [`docs/data-model.md`](./docs/data-model.md).

---

## Features

| Pillar | What it does |
|---|---|
| **Shared care record** | Recipient profile (conditions, allergies, blood type, directives), documents vault, emergency card |
| **Medications** | Structured regimens + schedules, give/skip/refuse logging, PRN caps, supply & refill alerts, a drug-interaction/allergy **safety check** *(illustrative demo KB — see note)* |
| **Care timeline** | One chronological feed of meds, vitals, notes, photos, incidents — with comments & reactions |
| **Appointments** | Shared calendar, assignment, pre-visit prep checklist, post-visit summary |
| **Tasks & rota** | Assignable/recurring tasks, weekly shift schedule, **fair-share** contribution view |
| **Roles & permissions** | Owner, family (full/limited), professional caregiver, read-only, care recipient, clinician — DB-enforced |
| **Vitals & health** | BP, glucose, weight, sleep, mood, HR with trend charts & **per-circle alert safe ranges** (DB-persisted; out-of-range readings post urgent alerts + SNS escalation) |
| **Smart layer (AI)** | **Daily Digest** (warm AI summary, **translated into each member's own language** — the aide reads it in Tagalog, the son in Dubai in English, cached one model call per language per day), **Ask CareCircle** (permission-aware RAG), **daily care scans** (refill sweep, missed-dose reconciliation, 3-day decline alerts) |
| **Notifications** | Role/event-aware alerts; urgent escalation (a logged fall alerts coordinators instantly) |
| **Emergency mode** | One-tap shareable emergency card for EMS/ER |
| **Admin (B2B)** | Cross-tenant platform console (email-allowlisted, audited) for staff/agencies |

---

## Security model (defense-in-depth, fail-closed)

See [`AGENTS.md`](./AGENTS.md) for the full, enforced invariants. In short:

1. Every authenticated page lives under `src/app/(app)/` whose layout runs `requireSession()`.
2. `proxy.ts` gates every route unless explicitly allowlisted (optimistic edge layer only).
3. **All tenant data access goes through `withAuthedDb()`** — an RLS-scoped transaction. Aurora RLS is the final guarantee.
4. Server actions/routes re-check auth and authorize the **specific** action against the user's real role.
5. Secrets stay server-side; passwords hashed; reset tokens hashed, single-use, short-lived.
6. Every sensitive/state-changing action emits **two trails**: an operational `serverLog(...)` and a durable `recordAuditEvent(...)`.

---

## Tech stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind v4 + Radix UI · Drizzle ORM · `postgres.js` · Auth.js (NextAuth v5) · AWS SDK v3 (Bedrock Runtime, S3, SES, SNS) · `pgvector` · LangChain text splitters · Terraform.

---

## Running locally

> Requires Node 20+, an Aurora PostgreSQL (or any Postgres 15+ with the `vector` extension), and — for the AI features — Amazon Bedrock access.

```bash
npm install
cp .env.example .env          # then fill in the values (see comments in that file)

npm run db:migrate            # apply schema + RLS policies (uses MIGRATION_DATABASE_URL)
npm run db:setup-rls          # create the least-privilege carecircle_app role + prove RLS, repoint DATABASE_URL
npm run db:seed               # seed the living demo circle (6 weeks of meds, vitals, tasks, docs, an incident…)

npm run dev                   # http://localhost:3000
```

**Demo personas** (all password `CareCircle123`, printed by the seed): `maria@carecircle.demo` (coordinator) ·
`paolo@carecircle.demo` (remote family) · `grace@carecircle.demo` (aide — reads the digest in Tagalog) ·
`antonio@carecircle.demo` (care recipient) · `rosa@carecircle.demo` (read-only) · `admin@carecircle.demo` (platform admin → `/admin`).
Set `NEXT_PUBLIC_DEMO_MODE=1` to show one-click persona sign-in buttons on `/sign-in` **and** the homepage
**"Run demo"** button, which creates an anonymous guest account (RLS-scoped to only the demo circle, `family`
role, wiped on re-seed) and lands a reviewer on the live dashboard with zero sign-up — see `src/lib/auth/demo.ts`
for the fail-closed security model.

Key environment variables (full list + guidance in [`.env.example`](./.env.example)):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | **Least-privilege** app role — RLS is enforced through this |
| `MIGRATION_DATABASE_URL` | Admin/owner connection for migrations & seed (bypasses RLS) |
| `AUTH_SECRET` | Auth.js session secret |
| `AWS_REGION`, AWS credentials | Bedrock / S3 / SES / SNS |
| `BEDROCK_MODEL_ID` | Claude inference-profile id (account/region-specific) |
| `CRON_SECRET` | Shared secret for the digest cron (Vercel injects it as `Authorization: Bearer …`) |
| `PLATFORM_ADMIN_EMAILS` | Allowlist for the cross-tenant `/admin` console |

---

## Deploying to Vercel

1. Import the repo into Vercel and set the env vars above in **Project → Settings → Environment Variables** (including `CRON_SECRET`).
2. Aurora must be reachable from Vercel functions (publicly accessible instance or a tunnel/VPC connector).
3. Scheduled jobs live in [`vercel.json`](./vercel.json), both `CRON_SECRET`-gated: the **nightly Daily Digest** (`/api/cron/digest`, hourly — generates + emails each circle's digest at its local `digestHour`, idempotent per day) and the **daily care scans** (`/api/cron/scans`, every 6h — refill sweep, missed-dose reconciliation, decline alerts; every sweep idempotent).
4. **Recommended — keyless AWS via OIDC:** trust Vercel's OIDC issuer in AWS IAM, set `AWS_ROLE_ARN`, and remove the static AWS keys (see [`SETUP.md`](./SETUP.md) § "Vercel OIDC → AWS"). All AWS clients (Bedrock, S3, SES, SNS) resolve credentials through `src/lib/aws/credentials.ts`.

---

## Tests

```bash
npm test                 # unit tests (no AWS, no DB) — always run
TEST_DATABASE_URL=... npm test   # additionally runs the RLS integration suite
```

- **Unit suite** (`src/**/__tests__/*.test.ts`): proves the application-layer authorization matrices (who can manage meds, record doses, see restricted documents, report/resolve incidents, post private notes, reach the cross-tenant admin console, …) and that the **AWS Bedrock client is mocked** — no real AWS calls in tests.
- **RLS integration suite** (`src/db/__tests__/rls.integration.test.ts`): runs **only** when `TEST_DATABASE_URL` points at a throwaway Postgres. It applies the real migrations, connects as the least-privilege `carecircle_app` role, and asserts the database itself enforces **cross-tenant isolation** and the **sensitivity tiers** for `rag_chunk` retrieval (a read-only member can never retrieve a `restricted` chunk; circle A never sees circle B). AWS is never touched — vectors are inserted directly.
- **CI** ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)): every push runs lint, type-check, the unit suite, **and the RLS integration suite against a real `pgvector/pgvector` Postgres service** — so the badge at the top of this README is a continuously re-verified proof of the security claim, not a one-time assertion.

---

## Note on demo data

This is a hackathon demo. Clinical content (e.g. the drug-interaction safety check in `src/components/medications/safety.ts`) uses a small **illustrative knowledge base**, clearly labeled in code — a production system would call a licensed clinical-interactions service (shown as an external dependency in the architecture diagram). All seeded people and records are fictional.
