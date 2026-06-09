import 'server-only';

/**
 * Read layer for the Incidents feature — turns the normalized rows (incident +
 * incident_notification + incident_comment) into the exact shapes the client renders, with member
 * display fields, the current user's ack, and the photo resolved to a short-lived URL.
 *
 * Security (see AGENTS.md): all reads go through `withAuthedDb()` (RLS-scoped) AND are pinned to the
 * active circle. Reading one's own circle's incidents is normal app data → operational `serverLog`.
 */
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { dbRoleLabel } from '@/lib/circle/roles';
import { resolveStoredUrl } from '@/lib/storage/s3';
import {
  incident as incidentTable,
  incidentNotification,
  incidentComment,
  membership,
  users,
  careRecipientProfile,
} from '@/db/schema';
import type {
  AckStatus,
  EmergencyContact,
  Incident,
  IncidentDetailData,
  IncidentReportContext,
  IncidentsData,
  IncidentStatus,
  IncidentType,
  Member,
  Severity,
} from '@/components/incidents/types';

// Deterministic per-member avatar tint, assigned by join order (matches the other features).
const AVATAR_COLORS = [
  'bg-accent/10 text-accent',
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
];

// Roles offered as default notify targets (the active caregiving team).
const NOTIFY_DEFAULT_ROLES = ['owner', 'family_admin', 'family', 'caregiver'];
// Roles that can be a "primary contact" for the high-severity call shortcut.
const KIN_ROLES = ['owner', 'family_admin', 'family'];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'Someone';
}

interface MemberInfo {
  id: string;
  userId: string | null;
  role: string;
  name: string;
  initials: string;
  color: string;
  roleLabel: string;
  phone: string | null;
  notifyEscalations: boolean;
}

/** Load the circle's active members and build a display map keyed by membership id. */
async function loadMembers(
  tx: Parameters<Parameters<typeof withAuthedDb>[0]>[0],
  circleId: string,
): Promise<{ list: MemberInfo[]; byId: Map<string, MemberInfo> }> {
  const rows = await tx
    .select({
      id: membership.id,
      userId: membership.userId,
      role: membership.role,
      name: users.name,
      email: users.email,
      phone: membership.phone,
      notifyEscalations: membership.notifyEscalations,
    })
    .from(membership)
    .leftJoin(users, eq(users.id, membership.userId))
    .where(and(eq(membership.circleId, circleId), eq(membership.status, 'active'), isNull(membership.deletedAt)))
    .orderBy(asc(membership.createdAt));

  const list: MemberInfo[] = rows.map((m, i) => {
    const name = m.name ?? m.email ?? 'Member';
    return {
      id: m.id,
      userId: m.userId,
      role: m.role,
      name,
      initials: initialsFrom(name),
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      roleLabel: dbRoleLabel(m.role),
      phone: m.phone,
      notifyEscalations: m.notifyEscalations,
    };
  });
  return { list, byId: new Map(list.map((m) => [m.id, m])) };
}

/** Pick a primary emergency contact (a family member with a phone), or null. */
function pickEmergencyContact(members: MemberInfo[]): EmergencyContact | null {
  const kin = members.find((m) => m.phone && KIN_ROLES.includes(m.role));
  const any = kin ?? members.find((m) => m.phone);
  return any && any.phone ? { name: any.name, phone: any.phone } : null;
}

/** Shape a set of incident rows (+ their notifications/comments) into the UI `Incident[]`. */
async function buildIncidents(
  rows: (typeof incidentTable.$inferSelect)[],
  notifRows: (typeof incidentNotification.$inferSelect)[],
  commentRows: { id: string; incidentId: string; authorMembershipId: string | null; body: string; createdAt: Date }[],
  byId: Map<string, MemberInfo>,
  currentMembershipId: string | null,
): Promise<Incident[]> {
  const notifsByIncident = new Map<string, typeof notifRows>();
  for (const n of notifRows) {
    const list = notifsByIncident.get(n.incidentId) ?? [];
    list.push(n);
    notifsByIncident.set(n.incidentId, list);
  }
  const commentsByIncident = new Map<string, typeof commentRows>();
  for (const c of commentRows) {
    const list = commentsByIncident.get(c.incidentId) ?? [];
    list.push(c);
    commentsByIncident.set(c.incidentId, list);
  }

  return Promise.all(
    rows.map(async (r) => {
      const reporter = r.reportedByMembershipId ? byId.get(r.reportedByMembershipId) : undefined;
      const resolver = r.resolvedByMembershipId ? byId.get(r.resolvedByMembershipId) : undefined;
      const notifications = (notifsByIncident.get(r.id) ?? []).map((n) => {
        const m = byId.get(n.membershipId);
        return {
          membershipId: n.membershipId,
          name: m?.name ?? 'Former member',
          initials: m?.initials ?? '?',
          color: m?.color ?? 'bg-muted text-muted-foreground',
          roleLabel: m?.roleLabel ?? '—',
          status: n.status as AckStatus,
          at: n.acknowledgedAt ?? undefined,
        };
      });
      const comments = (commentsByIncident.get(r.id) ?? []).map((c) => {
        const m = c.authorMembershipId ? byId.get(c.authorMembershipId) : undefined;
        return {
          id: c.id,
          authorName: m ? firstName(m.name) : 'Someone',
          authorInitials: m?.initials ?? '?',
          authorColor: m?.color ?? 'bg-muted text-muted-foreground',
          text: c.body,
          at: c.createdAt,
        };
      });
      const myAck = currentMembershipId
        ? notifications.find((n) => n.membershipId === currentMembershipId)?.status
        : undefined;

      return {
        id: r.id,
        type: r.type as IncidentType,
        severity: r.severity as Severity,
        description: r.description,
        at: r.occurredAt,
        status: r.status as IncidentStatus,
        reporterName: firstName(reporter?.name),
        photoUrl: r.photoS3Key ? await resolveStoredUrl(r.photoS3Key) : undefined,
        notifications,
        comments,
        resolutionNote: r.resolutionNote ?? undefined,
        resolvedAt: r.resolvedAt ?? undefined,
        resolvedByName: resolver ? firstName(resolver.name) : undefined,
        myAck,
        timelineEventId: r.timelineEventId ?? undefined,
      } satisfies Incident;
    }),
  );
}

/** Load the active circle's incidents (newest first), with members resolved. Null if no circle. */
export async function getIncidentsData(): Promise<IncidentsData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('incidents', 'getIncidentsData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const data = await withAuthedDb(async (tx) => {
      const { byId, list } = await loadMembers(tx, circleId);

      const incidents = await tx
        .select()
        .from(incidentTable)
        .where(and(eq(incidentTable.circleId, circleId), isNull(incidentTable.deletedAt)))
        .orderBy(desc(incidentTable.occurredAt));

      const ids = incidents.map((i) => i.id);
      const notifs = ids.length
        ? await tx.select().from(incidentNotification).where(inArray(incidentNotification.incidentId, ids))
        : [];
      const comments = ids.length
        ? await tx
            .select({
              id: incidentComment.id,
              incidentId: incidentComment.incidentId,
              authorMembershipId: incidentComment.authorMembershipId,
              body: incidentComment.body,
              createdAt: incidentComment.createdAt,
            })
            .from(incidentComment)
            .where(and(inArray(incidentComment.incidentId, ids), isNull(incidentComment.deletedAt)))
            .orderBy(asc(incidentComment.createdAt))
        : [];

      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1);

      const currentMembershipId = list.find((m) => m.userId === userId)?.id ?? null;
      return { byId, incidents, notifs, comments, recipient, currentMembershipId };
    });

    const incidents = await buildIncidents(
      data.incidents,
      data.notifs,
      data.comments,
      data.byId,
      data.currentMembershipId,
    );
    const recipientName = data.recipient?.fullName?.trim().split(/\s+/)[0] ?? null;

    serverLog('incidents', 'getIncidentsData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      incidents: incidents.length,
    });
    return { circleId, incidents, recipientName };
  } catch (err) {
    serverLog('incidents', 'getIncidentsData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}

/** Load one incident (with members + emergency contact). Null if unauth / no circle / not found. */
export async function getIncidentDetail(incidentId: string): Promise<IncidentDetailData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) return null;

    const data = await withAuthedDb(async (tx) => {
      const { byId, list } = await loadMembers(tx, circleId);
      const [row] = await tx
        .select()
        .from(incidentTable)
        .where(
          and(
            eq(incidentTable.id, incidentId),
            eq(incidentTable.circleId, circleId),
            isNull(incidentTable.deletedAt),
          ),
        )
        .limit(1);
      if (!row) return null;

      const notifs = await tx
        .select()
        .from(incidentNotification)
        .where(eq(incidentNotification.incidentId, incidentId));
      const comments = await tx
        .select({
          id: incidentComment.id,
          incidentId: incidentComment.incidentId,
          authorMembershipId: incidentComment.authorMembershipId,
          body: incidentComment.body,
          createdAt: incidentComment.createdAt,
        })
        .from(incidentComment)
        .where(and(eq(incidentComment.incidentId, incidentId), isNull(incidentComment.deletedAt)))
        .orderBy(asc(incidentComment.createdAt));

      const currentMembershipId = list.find((m) => m.userId === userId)?.id ?? null;
      return { byId, list, row, notifs, comments, currentMembershipId };
    });

    if (!data) {
      serverLog('incidents', 'getIncidentDetail', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const [incident] = await buildIncidents(
      [data.row],
      data.notifs,
      data.comments,
      data.byId,
      data.currentMembershipId,
    );

    serverLog('incidents', 'getIncidentDetail', 'success', { email: maskEmail(session.user?.email), found: true });
    return { circleId, incident, emergencyContact: pickEmergencyContact(data.list) };
  } catch (err) {
    serverLog('incidents', 'getIncidentDetail', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}

/** Context for the report flow: who can be notified (+ defaults), recipient name, emergency contact. */
export async function getIncidentReportContext(): Promise<IncidentReportContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) return null;

    const data = await withAuthedDb(async (tx) => {
      const { list } = await loadMembers(tx, circleId);
      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1);
      return { list, recipient };
    });

    // Everyone but the current user (you don't notify yourself when you're the reporter).
    const others = data.list.filter((m) => m.userId !== userId);
    const members: Member[] = others.map((m) => ({
      id: m.id,
      name: m.name,
      initials: m.initials,
      color: m.color,
      roleLabel: m.roleLabel,
      notifyEscalations: m.notifyEscalations,
    }));
    const defaultNotifyIds = others
      .filter((m) => m.notifyEscalations && NOTIFY_DEFAULT_ROLES.includes(m.role))
      .map((m) => m.id);

    return {
      circleId,
      members,
      defaultNotifyIds,
      recipientName: data.recipient?.fullName?.trim().split(/\s+/)[0] ?? null,
      emergencyContact: pickEmergencyContact(others),
    };
  } catch (err) {
    serverLog('incidents', 'getIncidentReportContext', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
