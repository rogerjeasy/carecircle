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
import { membership, users, pushSubscription, timelineEvent } from '@/db/schema';
import { sendNotificationEmail } from '@/lib/email';
import { sendWebPush, type StoredSubscription } from '@/lib/push/send';
import { isPushConfigured } from '@/lib/push/config';
import { getAppOrigin } from '@/lib/url';
import { serverLog } from '@/lib/log';
import type { UndeliverableReason } from '@/lib/email-address';
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

/** A member we could NOT email because their address can't receive mail (demo/invalid). */
interface UndeliverableRecipient {
  name: string | null;
  reason: UndeliverableReason;
}

/**
 * Phrase WHY a batch of notification emails went undelivered, for the in-app notice. When every
 * skipped address failed for the same reason we say so specifically; a mixed batch gets a neutral
 * catch-all. (Demo seed addresses are by far the common case.)
 */
function reasonPhrase(recipients: UndeliverableRecipient[]): string {
  const reasons = new Set(recipients.map((r) => r.reason));
  if (reasons.size === 1) {
    const only = recipients[0].reason;
    if (only === 'demo_address') return 'their address is a demo/placeholder that can’t receive email';
    if (only === 'reserved_tld') return 'their address uses a reserved domain that can’t receive email';
    return 'their email address isn’t valid';
  }
  return 'their email addresses can’t receive mail';
}

/** Human-join up to three member names, then "+N more" (so the summary stays scannable). */
function joinNames(recipients: UndeliverableRecipient[]): string {
  const names = recipients.map((r) => r.name?.trim() || 'a member');
  if (names.length <= 3) {
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
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
        name: users.name,
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
    // Members whose email we deliberately DIDN'T send because the address can't receive mail (a
    // `.demo` seed address or an invalid one). We surface these in-app after the fan-out so the
    // circle knows the email never went out — see the system timeline event below.
    const undeliverable: UndeliverableRecipient[] = [];

    // Fan out in parallel — one slow push service must not serialize the whole circle.
    const sends: Promise<void>[] = [];
    for (const m of members) {
      if (input.excludeUserId && m.userId === input.excludeUserId) continue;
      const prefs = withDefaults(m.prefs);
      const timeZone = m.timezone ?? undefined;

      // ── Email ──
      if (m.email && shouldDeliver({ prefs, type, channel: 'email', urgent, now, timeZone })) {
        const to = m.email;
        const name = m.name;
        sends.push(
          sendNotificationEmail({ to, title, body, url })
            .then((res) => {
              if (res.delivered) emailed += 1;
              // Address can't receive mail → don't count it as emailed; log it for the in-app notice.
              else undeliverable.push({ name, reason: res.reason });
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

    // In-app fallback: when an email couldn't be sent because the address can't receive mail, post a
    // `system` event to the circle's timeline so the notice still reaches people (it's what powers the
    // in-app notifications feed). The underlying update is already on the timeline; this records that
    // the EMAIL copy didn't go out — and to whom — without ever attempting an undeliverable send.
    if (undeliverable.length > 0) {
      const summary =
        `Couldn’t email ${joinNames(undeliverable)} about “${title}” — ${reasonPhrase(undeliverable)}. ` +
        `No email was sent; the update is still here in the app.`;
      await db.insert(timelineEvent).values({
        circleId,
        actorMembershipId: null, // system-generated, not a member action
        eventType: 'system',
        summary,
        refType: 'email_undeliverable',
        visibility: 'all',
        isUrgent: false,
        payload: {
          kind: 'email_undeliverable',
          title,
          url,
          recipients: undeliverable.map((r) => ({ name: r.name, reason: r.reason })),
        },
      });
    }

    serverLog('notifications', 'dispatch', 'success', {
      circle: circleId,
      type,
      urgent,
      recipients: members.length,
      emailed,
      pushed,
      pruned,
      undeliverable: undeliverable.length,
    });
  } catch (err) {
    serverLog('notifications', 'dispatch', 'failure', { circle: circleId, type, reason: (err as Error)?.name ?? 'error' });
  }
}
