import 'server-only';

/**
 * Read layer for the Appointments screen — loads the active circle's appointments, its assignable
 * members ("who's taking them"), and the care recipient's name, shaped as the client renders.
 *
 * Security (see AGENTS.md): RLS-scoped via `withAuthedDb()` and pinned to the active circle.
 */
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { appointment, careRecipientProfile, membership, users } from '@/db/schema';
import type {
  Appointment,
  AppointmentKind,
  AppointmentStatus,
  AppointmentsData,
  Member,
  PrepQuestion,
} from '@/components/appointments/types';

const ASSIGNABLE_ROLES = ['owner', 'family_admin', 'family', 'caregiver'];

const AVATAR_COLORS = [
  'bg-accent/10 text-accent',
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
];

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Load the active circle's appointments + members + recipient name. Null if unauth / no circle. */
export async function getAppointmentsData(): Promise<AppointmentsData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('appointments', 'getAppointmentsData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const data = await withAuthedDb(async (tx) => {
      const apptRows = await tx
        .select()
        .from(appointment)
        .where(and(eq(appointment.circleId, circleId), isNull(appointment.deletedAt)))
        .orderBy(asc(appointment.startsAt));

      const memberRows = await tx
        .select({ id: membership.id, name: users.name })
        .from(membership)
        .leftJoin(users, eq(users.id, membership.userId))
        .where(
          and(
            eq(membership.circleId, circleId),
            eq(membership.status, 'active'),
            isNull(membership.deletedAt),
            inArray(membership.role, ASSIGNABLE_ROLES as never[]),
          ),
        )
        .orderBy(asc(membership.createdAt));

      const [recipient] = await tx
        .select({ fullName: careRecipientProfile.fullName })
        .from(careRecipientProfile)
        .where(eq(careRecipientProfile.circleId, circleId))
        .limit(1);

      return { apptRows, memberRows, recipient };
    });

    const members: Member[] = data.memberRows.map((m, i) => {
      const name = m.name ?? 'Member';
      return { id: m.id, name, initials: initialsFrom(name), color: AVATAR_COLORS[i % AVATAR_COLORS.length] };
    });

    const appointments: Appointment[] = data.apptRows.map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind as AppointmentKind,
      provider: a.provider ?? '',
      location: a.location ?? '',
      start: a.startsAt,
      durationMin: a.durationMin,
      assignedMemberId: a.assignedToMembershipId,
      status: a.status as AppointmentStatus,
      notes: a.notes ?? undefined,
      prep: (a.prep ?? []) as PrepQuestion[],
      visitSummary: a.visitSummary ?? undefined,
      postedToTimeline: a.postedToTimeline,
    }));

    const recipientName = data.recipient?.fullName?.trim().split(/\s+/)[0] ?? null;

    serverLog('appointments', 'getAppointmentsData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      appointments: appointments.length,
      members: members.length,
    });

    return { circleId, appointments, members, recipientName };
  } catch (err) {
    serverLog('appointments', 'getAppointmentsData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
