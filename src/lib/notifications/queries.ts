'use server';

/**
 * Notifications feed — derived from the circle's REAL activity (the timeline). The timeline is the
 * activity-stream spine (RLS-scoped, active-circle pinned), so notifications inherit its tenancy +
 * visibility guarantees for free. Safe to call from a client component (server action; only
 * serializable fields cross the boundary).
 */
import { getTimelineData } from '@/lib/timeline/queries';
import type { NotificationItem, NotificationType } from '@/components/notifications/types';

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
  const data = await getTimelineData();
  if (!data) return [];
  return data.events.slice(0, 25).map((e) => {
    const type = toNotifType(e.type);
    return {
      id: e.id,
      type,
      urgent: Boolean(e.isUrgent),
      actor: { id: e.id, name: e.authorName, initials: e.authorInitials, color: e.authorColor },
      summary: e.summary,
      href: TYPE_HREF[type],
      at: e.timestamp,
      read: false,
    };
  });
}
