## Kintwadi — one shared record for family caregiving

Care-coordination platform that puts every family member, caregiver, and clinician
on one loved one's record, with **role-scoped views enforced at the database**, AI
daily digests, and a grounded **"Ask Kintwadi"** over the circle's own data.

🔗 **Live:** https://kintwadi.vercel.app
🛠 **Built for:** Hack the Zero Stack (#H0Hackathon) — Monetizable B2C track

### Highlights
- **One shared care record** — meds, vitals, tasks, timeline, documents, and an
  emergency card, shared across the family, the aide, and the parent.
- **Security enforced in the database** — Amazon Aurora PostgreSQL Row-Level
  Security scopes every read/write to the user's care circle (defense-in-depth,
  fail-closed), with an append-only audit log for medical-grade traceability.
- **Atomic medication safety** — giving a dose updates the log, supply count, and
  timeline in one ACID transaction; low-supply alerts auto-route refill tasks.
- **AI daily digest** — a warm, Bedrock-generated summary of the day, per member
  in their own language.
- **Ask Kintwadi (RAG)** — Amazon Bedrock Titan embeddings + pgvector retrieval
  under the *same* RLS, answered by Claude on Bedrock, with cited sources.
- **Multi-language, mobile-first UI**, web-push notifications, and a calm,
  glanceable dashboard.

### Tech stack
- **Frontend:** Next.js 16 + Tailwind CSS, deployed on **Vercel**
- **Database:** **Amazon Aurora PostgreSQL** (Serverless v2) with `pgvector`,
  Row-Level Security, ACID transactions, append-only audit log
- **AI (all on AWS):** **Amazon Bedrock** — Titan embeddings + Claude
- **ORM / auth:** Drizzle ORM · NextAuth v5

🤖 Created for this hackathon.
