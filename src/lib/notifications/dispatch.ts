import 'server-only';

/**
 * Central notification fan-out — the OUTBOUND side of Settings → Notifications (Email + Web Push).
 *
 * Event sources (a dose given, a vital logged, a task assigned, an incident, the digest) call
 * `dispatchNotification(...)` AFTER their write commits, best-effort. For every active member of the
 * circle we consult their saved preferences via the shared `shouldDeliver` gate — matrix toggle +
 * quiet hours, urgent bypassing quiet — and deliver on each enabled channel. The in-app channel is
 * enforced separately at read time (the feed filter), so this module handles Email + Push only.
 *
 * 🔒 Security (see AGENTS.md): fan-out must read EVERY member's prefs, email and push endpoints,
 * which per-user RLS deliberately hides — so, exactly like the digest cron, it uses the privileged
 * cross-tenant connection (`getPlatformDb`). It NEVER throws into the caller, and logs only
 * ids/counts — never email addresses, endpoints, or message bodies (which may carry PII).
 */
import { and, eq, isNull } from 'drizzle-orm';
import { getPlatformDb, isPlatformDbConfigured } from '@/db/admin-db';
import { membership, users, pushSubscription } from '@/db/schema';
import { sendNotificationEmail } from '@/lib/email';
import { sendWebPush, type StoredSubscription } from '@/lib/push/send';
import { isPushConfigured } from '@/lib/push/config';
import { getAppOrigin } from '@/lib/url';
import { serverLog } from '@/lib/log';
import { shouldDeliver, withDefaults, type NotifTypeKey } from './prefs';

export interface DispatchInput {
  circleId: string;
  /** Which matrix row this is (meds | vitals | tasks | incidents | digest). */
  type: NotifTypeKey;
  /** Urgent notifications bypass quiet hours (matrix toggle still respected). */
  urgent?: boolean;
  /** Email subject / push title. */
  title: string;
  /** One-line body for the email + push. */
  body: string;
  /** App-relative path the email CTA and push click open (e.g. "/medications"). */
  path: string;
  /** Don't notify this user — usually the actor who triggered the event. */
  excludeUserId?: string;
}

interface SubRow extends StoredSubscription {
  id: string;
  membershipId: string;
}

/**
 * Fan a notification out to a circle's members on their enabled outbound channels. Best-effort and
 * non-throwing — intended to be awaited at the end of an action's success path.
 */
export async function dispatchNotification(input: DispatchInput): Promise<void> {
  const { circleId, type, title, body, path } = input;
  const urgent = Boolean(input.urgent);

  if (!isPlatformDbConfigured()) {
    // No cross-tenant connection → we can't read other members' prefs/endpoints. In-app still works.
    serverLog('notifications', 'dispatch', 'failure', { circle: circleId, type, reason: 'platform_db_unconfigured' });
    return;
  }

  try {
    const db = getPlatformDb();
    const origin = await getAppOrigin();
    const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
    const now = new Date();

    const members = await db
      .select({
        membershipId: membership.id,
        userId: membership.userId,
        email: users.email,
        timezone: users.timezone,
        prefs: membership.notificationPrefs,
      })
      .from(membership)
      .innerJoin(users, eq(users.id, membership.userId))
      .where(and(eq(membership.circleId, circleId), eq(membership.status, 'active'), isNull(membership.deletedAt)));

    // Push endpoints for the circle, grouped by member (only when push is configured at all).
    const pushOn = isPushConfigured();
    const subs: SubRow[] = pushOn
      ? await db
          .select({
            id: pushSubscription.id,
            membershipId: pushSubscription.membershipId,
            endpoint: pushSubscription.endpoint,
            p256dh: pushSubscription.p256dh,
            auth: pushSubscription.auth,
          })
          .from(pushSubscription)
          .where(eq(pushSubscription.circleId, circleId))
      : [];
    const subsByMember = new Map<string, SubRow[]>();
    for (const s of subs) {
      const arr = subsByMember.get(s.membershipId) ?? [];
      arr.push(s);
      subsByMember.set(s.membershipId, arr);
    }

    let emailed = 0;
    let pushed = 0;
    let pruned = 0;

    // Fan out in parallel — one slow push service must not serialize the whole circle.
    const sends: Promise<void>[] = [];
    for (const m of members) {
      if (input.excludeUserId && m.userId === input.excludeUserId) continue;
      const prefs = withDefaults(m.prefs);
      const timeZone = m.timezone ?? undefined;

      // ── Email ──
      if (m.email && shouldDeliver({ prefs, type, channel: 'email', urgent, now, timeZone })) {
        const to = m.email;
        sends.push(
          sendNotificationEmail({ to, title, body, url })
            .then(() => {
              emailed += 1;
            })
            .catch(() => {
              /* deliver() already logged the masked failure; one bad send must not stop the fan-out */
            }),
        );
      }

      // ── Web Push ──
      if (pushOn && shouldDeliver({ prefs, type, channel: 'push', urgent, now, timeZone })) {
        for (const s of subsByMember.get(m.membershipId) ?? []) {
          sends.push(
            sendWebPush(s, { title, body, url, urgent })
              .then(async (res) => {
                if (res === 'sent') {
                  pushed += 1;
                } else if (res === 'gone') {
                  // Expired subscription → prune so we stop trying it.
                  await db.delete(pushSubscription).where(eq(pushSubscription.id, s.id));
                  pruned += 1;
                }
              })
              .catch(() => {
                /* a send/prune hiccup is non-fatal */
              }),
          );
        }
      }
    }
    await Promise.allSettled(sends);

    serverLog('notifications', 'dispatch', 'success', {
      circle: circleId,
      type,
      urgent,
      recipients: members.length,
      emailed,
      pushed,
      pruned,
    });
  } catch (err) {
    serverLog('notifications', 'dispatch', 'failure', { circle: circleId, type, reason: (err as Error)?.name ?? 'error' });
  }
}
