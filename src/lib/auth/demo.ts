'use server';

/**
 * "Run demo" — one-tap anonymous guest access to the seeded demo circle, for judges/reviewers
 * who shouldn't have to sign up + onboard before seeing the product.
 *
 * What a click does: creates a REAL, persisted guest account (`guest-…@guest.kintwadi.demo`,
 * random password, never shown), adds it to the demo circle as a `family` member, signs it in via
 * the normal Auth.js credentials flow, and the client redirects to /dashboard.
 *
 * 🔒 Security model (see AGENTS.md — fail-closed, defense-in-depth):
 *  - Feature-flagged: every call is rejected unless NEXT_PUBLIC_DEMO_MODE === '1'. A real
 *    production deployment leaves the flag unset and this action authorizes no one.
 *  - Isolation is RLS, as everywhere else: the guest's ONLY membership is the demo circle, so Row-
 *    Level Security makes every other tenant's data unreachable — a guest session is structurally
 *    incapable of touching anyone's personal data. No special "demo bypass" exists anywhere.
 *  - Role `family` (not a coordinator): guests can live the product — record doses, post updates,
 *    complete tasks, generate/translate the digest, use Ask — but cannot manage people/roles,
 *    edit circle settings, or remove members, so one guest can't break the demo for the next.
 *  - The membership insert needs the privileged connection (an anonymous visitor can't pass any
 *    RLS write policy, by design). It writes exactly two constrained rows (membership + audit),
 *    is gated by the flag above, and both trails are emitted (serverLog + audit_log row).
 *  - Notifications are off for guests (their address isn't deliverable), and a light in-memory
 *    per-IP rate limit blunts scripted account creation. Demo guests are wiped by `npm run db:seed`.
 */
import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { users, membership, auditLog } from '@/db/schema';
import { getPlatformDb, isPlatformDbConfigured } from '@/db/admin-db';
import { hashPassword } from '@/lib/password';
import { signIn, auth } from '@/auth';
import { serverLog } from '@/lib/log';

export type StartDemoResult = { ok: true } | { ok: false; error: string };

const DEMO_OWNER_EMAIL = 'maria@kintwadi.demo';
const GUEST_EMAIL_DOMAIN = 'guest.kintwadi.demo';
const DEMO_UNAVAILABLE = 'The live demo isn’t available right now. Please try the sign-in page.';

// Best-effort per-IP limiter (per server instance): 3 new guests per 10 minutes is plenty for a
// human reviewer and blunts loops. Not a hard security control — the flag + RLS are.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const recentByIp = new Map<string, number[]>();

async function isRateLimited(): Promise<boolean> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const hits = (recentByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  recentByIp.set(ip, hits);
  if (recentByIp.size > 5000) recentByIp.clear(); // crude memory cap
  return false;
}

/** Create a guest account in the demo circle and sign it in. The client then goes to /dashboard. */
export async function startDemoSession(): Promise<StartDemoResult> {
  serverLog('auth', 'startDemo', 'start');

  // Fail-closed feature flag: no demo mode, no anonymous accounts — ever.
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== '1') {
    serverLog('auth', 'startDemo', 'failure', { reason: 'demo_mode_off' });
    return { ok: false, error: DEMO_UNAVAILABLE };
  }

  // Already signed in (a guest re-clicking, or a real user)? Just proceed to the dashboard.
  const session = await auth();
  if (session?.user?.id) {
    serverLog('auth', 'startDemo', 'success', { reason: 'already_signed_in' });
    return { ok: true };
  }

  if (await isRateLimited()) {
    serverLog('auth', 'startDemo', 'failure', { reason: 'rate_limited' });
    return { ok: false, error: 'Too many demo sessions from your network — try again in a few minutes.' };
  }
  if (!isPlatformDbConfigured()) {
    serverLog('auth', 'startDemo', 'failure', { reason: 'no_admin_connection' });
    return { ok: false, error: DEMO_UNAVAILABLE };
  }

  try {
    // Locate the seeded demo circle via its owner account (fail-closed if the seed isn't loaded).
    const platformDb = getPlatformDb();
    const [owner] = await platformDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, DEMO_OWNER_EMAIL))
      .limit(1);
    if (!owner) {
      serverLog('auth', 'startDemo', 'failure', { reason: 'demo_circle_missing' });
      return { ok: false, error: DEMO_UNAVAILABLE };
    }
    const [ownerMembership] = await platformDb
      .select({ circleId: membership.circleId })
      .from(membership)
      .where(and(eq(membership.userId, owner.id), eq(membership.status, 'active'), isNull(membership.deletedAt)))
      .limit(1);
    if (!ownerMembership) {
      serverLog('auth', 'startDemo', 'failure', { reason: 'demo_circle_missing' });
      return { ok: false, error: DEMO_UNAVAILABLE };
    }

    // The guest identity: anonymous but persisted, with a strong random password nobody ever sees
    // (the session cookie is the only key; sign-out simply ends the visit).
    const slug = randomBytes(6).toString('hex');
    const email = `guest-${slug}@${GUEST_EMAIL_DOMAIN}`;
    const password = randomBytes(24).toString('base64url');
    const passwordHash = await hashPassword(password);

    // Identity tables carry no tenant data and have no RLS — same base-db insert as sign-up.
    const [guest] = await db
      .insert(users)
      .values({ name: 'Guest Reviewer', email, passwordHash })
      .returning({ id: users.id });

    // Membership (privileged, flag-gated path — an anonymous visitor can't satisfy any RLS write
    // policy by design) + the durable audit trail, atomically.
    await platformDb.transaction(async (tx) => {
      const [m] = await tx
        .insert(membership)
        .values({
          circleId: ownerMembership.circleId,
          userId: guest.id,
          role: 'family',
          relationshipLabel: 'Guest reviewer',
          notifyDigest: false,
          notifyEscalations: false,
        })
        .returning({ id: membership.id });
      await tx.insert(auditLog).values({
        circleId: ownerMembership.circleId,
        actorUserId: guest.id,
        actorMembershipId: m.id,
        action: 'create',
        entityType: 'membership',
        entityId: m.id,
        summary: 'Demo guest joined the circle via “Run demo”',
      });
    });

    await signIn('credentials', { email, password, redirect: false });
    serverLog('auth', 'startDemo', 'success', { guest: guest.id });
    return { ok: true };
  } catch (err) {
    serverLog('auth', 'startDemo', 'failure', { reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: DEMO_UNAVAILABLE };
  }
}
