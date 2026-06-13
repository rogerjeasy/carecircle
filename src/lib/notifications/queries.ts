'use server';

/**
 * Notifications feed — derived from the circle's REAL activity (the timeline). The timeline is the
 * activity-stream spine (RLS-scoped, active-circle pinned), so notifications inherit its tenancy +
 * visibility guarantees for free. Safe to call from a client component (server action; only
 * serializable fields cross the boundary).
 */
import { getTimelineData } from '@/lib/timeline/queries';
import { loadNotificationSettings } from '@/lib/notifications/settings';
import { channelEnabled, type NotifTypeKey } from '@/lib/notifications/prefs';
import type { NotificationItem, NotificationType } from '@/components/notifications/types';

/**
 * Notification kind → the Settings matrix row it belongs to. Only mapped kinds are gated by the
 * member's "In-app" toggle; un-mapped kinds (a note/mention, an appointment) have no matrix control
 * and always show. Urgent items always show regardless. (Tasks currently surface on the timeline as
 * notes, so they ride the un-gated 'mention' path until the timeline preserves their type.)
 */
const MATRIX_TYPE: Partial<Record<NotificationType, NotifTypeKey>> = {
  med: 'meds',
  vital: 'vitals',
  task: 'tasks',
  incident: 'incidents',
  digest: 'digest',
};

/** Where tapping a notification of each type deep-links to. */
const TYPE_HREF: Record<NotificationType, string> = {
  med: '/medications',
  vital: '/health',
  task: '/tasks',
  incident: '/incidents',
  mention: '/timeline',
  appointment: '/appointments',
  digest: '/digest',
};

/** Timeline event type → notification type (notes/tasks fold into the conversational "mention"). */
function toNotifType(eventType: string): NotificationType {
  switch (eventType) {
    case 'med':
    case 'vital':
    case 'appointment':
    case 'incident':
      return eventType;
    default:
      return 'mention';
  }
}

/**
 * The active circle's most recent activity as notification items (newest first). `read` is always
 * false here — read/dismissed state is layered on the client (the store persists it per-browser).
 */
export async function getNotifications(): Promise<NotificationItem[]> {
  const [data, prefsRes] = await Promise.all([getTimelineData(), loadNotificationSettings()]);
  if (!data) return [];
  // Honor the member's "In-app" matrix toggles. If prefs can't load, fall back to showing all.
  const prefs = prefsRes.ok ? prefsRes.prefs : null;

  const items: NotificationItem[] = [];
  for (const e of data.events) {
    const type = toNotifType(e.type);
    const urgent = Boolean(e.isUrgent);
    const matrixType = MATRIX_TYPE[type];
    // Drop a non-urgent item whose type the member switched OFF for in-app. Urgent always shows.
    if (prefs && matrixType && !urgent && !channelEnabled(prefs, matrixType, 'inApp')) continue;
    items.push({
      id: e.id,
      type,
      urgent,
      actor: { id: e.id, name: e.authorName, initials: e.authorInitials, color: e.authorColor },
      summary: e.summary,
      href: TYPE_HREF[type],
      at: e.timestamp,
      read: false,
    });
    if (items.length >= 25) break;
  }
  return items;
}
