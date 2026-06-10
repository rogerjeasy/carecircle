import 'server-only';

/**
 * Read layer for the role-aware home dashboard — assembles ONE circle-scoped bundle for whichever
 * role-view the user lands on (coordinator / caregiver / recipient / read-only / clinician).
 *
 * It deliberately REUSES the existing per-feature readers (medications, tasks, appointments, health,
 * timeline, rota, documents, emergency card, digest, recipient) rather than re-querying the DB, then
 * derives the small dashboard summaries (stat cards, week-at-glance, fair-share, vitals trends) on
 * top. Every underlying reader is already RLS-scoped via `withAuthedDb()` and pinned to the user's
 * ACTIVE circle, so switching circles in the sidebar changes everything the dashboard shows.
 *
 * Security (see AGENTS.md): no raw `db` access here; all data flows through the audited/RLS readers.
 * Reading one's own circle's home is normal app data → operational `serverLog` only.
 */
import { format, isToday, isTomorrow, formatDistanceToNow, subDays } from 'date-fns';
import { auth } from '@/auth';
import { resolveActiveMembership } from '@/lib/circle/active-circle';
import { dbRoleToUiRole } from '@/lib/circle/roles';
import { serverLog, maskEmail } from '@/lib/log';
import { getMedicationsData } from '@/lib/medications/queries';
import { getTasksData } from '@/lib/tasks/queries';
import { getAppointmentsData } from '@/lib/appointments/queries';
import { getHealthData } from '@/lib/health/queries';
import { getTimelineData } from '@/lib/timeline/queries';
import { getRotaData } from '@/lib/rota/queries';
import { getDocumentsData } from '@/lib/documents/queries';
import { getEmergencyCardData } from '@/lib/emergency-card/queries';
import { getDigestByDate } from '@/lib/digest/queries';
import { getCareRecipient } from '@/lib/circle/care-recipient';
import { onCallNow, to12h, toMinutes, firstName as memberFirstName } from '@/components/rota/utils';
import { formatValue, statusOf, latestReading, readingsFor, moodFace, computeInsights } from '@/components/health/utils';
import { DEFAULT_THRESHOLDS } from '@/components/health/data';
import type {
  DashboardClinicalMed,
  DashboardData,
  DashboardDose,
  DashboardFairShare,
  DashboardIncident,
  DashboardUpdate,
  DayStatus,
  WeekDay,
} from '@/components/dashboard/types';

// Solid bar colours for the "fair share this week" chart, cycled by member order.
const FAIR_SHARE_COLORS = ['bg-primary', 'bg-accent', 'bg-info', 'bg-success', 'bg-warning'];

/** Relative time, e.g. "20 minutes ago". */
function timeAgo(d: Date): string {
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Friendly absolute label for an upcoming appointment, e.g. "Today, 10:30 AM" / "Thu, 2:00 PM". */
function friendlyWhen(d: Date): string {
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'EEE, h:mm a');
}

/** Compact label for the "next appointment" stat card, e.g. "Today 14:00" / "Thu 10:00". */
function compactWhen(d: Date): string {
  return isToday(d) ? `Today ${format(d, 'HH:mm')}` : format(d, 'EEE HH:mm');
}

/** A recorded incident's display date, e.g. "Today, 7:40 AM" / "May 4". */
function incidentWhen(d: Date): string {
  return isToday(d) ? `Today, ${format(d, 'h:mm a')}` : format(d, 'MMM d');
}

const DOC_KIND_LABEL: Record<string, string> = { pdf: 'PDF', image: 'Image', doc: 'Doc' };

/**
 * Assemble the whole dashboard for the signed-in user's ACTIVE circle. Returns `null` when the user
 * is unauthenticated or has no active circle (the dashboard then renders its built-in empty copy).
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    // One resolution gives us BOTH the active circle and this user's role in it (cookie-backed,
    // RLS-validated). The role drives which feature readers we run, so the payload carries only
    // the slices the user's active-membership experience actually renders.
    const active = await resolveActiveMembership();
    if (!active) {
      serverLog('dashboard', 'getDashboardData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }
    const circleId = active.circleId;
    const role = dbRoleToUiRole(active.role);

    // `family` renders the same coordinator home; the others each have a focused experience.
    const isCoordinatorView = role === 'coordinator' || role === 'family';
    const need = {
      meds: true, // every experience surfaces medications in some form
      tasks: isCoordinatorView || role === 'caregiver',
      appts: isCoordinatorView || role === 'care-recipient',
      health: isCoordinatorView || role === 'readonly' || role === 'clinician',
      timeline: isCoordinatorView || role === 'readonly' || role === 'clinician',
      rota: isCoordinatorView,
      docs: role === 'clinician',
      // The emergency card carries the full clinical profile + contacts (clinician + recipient);
      // lighter views just need the recipient's name/photo from getCareRecipient.
      emergency: role === 'clinician' || role === 'care-recipient',
      recipient: role !== 'clinician' && role !== 'care-recipient',
      digest: isCoordinatorView || role === 'readonly',
    };

    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    // Reuse the needed feature readers in parallel — each is independently RLS-scoped + active-circle
    // pinned. Skipped readers resolve to null; the derivations below already handle null inputs.
    const [meds, tasks, appts, health, timeline, rota, documents, emergency, recipient, digestToday] =
      await Promise.all([
        need.meds ? getMedicationsData() : Promise.resolve(null),
        need.tasks ? getTasksData() : Promise.resolve(null),
        need.appts ? getAppointmentsData() : Promise.resolve(null),
        need.health ? getHealthData() : Promise.resolve(null),
        need.timeline ? getTimelineData() : Promise.resolve(null),
        need.rota ? getRotaData() : Promise.resolve(null),
        need.docs ? getDocumentsData() : Promise.resolve(null),
        need.emergency ? getEmergencyCardData() : Promise.resolve(null),
        need.recipient ? getCareRecipient() : Promise.resolve(null),
        need.digest ? getDigestByDate(circleId, todayStr) : Promise.resolve(null),
      ]);

    // Digests usually cover a completed day — fall back to yesterday's if today's isn't generated yet.
    const digestRow = need.digest
      ? digestToday ?? (await getDigestByDate(circleId, format(subDays(now, 1), 'yyyy-MM-dd')))
      : null;

    // ---- Recipient (name/photo from the circle helper; clinical summary from the emergency card) ----
    const fullName = emergency?.fullName ?? recipient?.fullName ?? null;
    const dashRecipient = fullName
      ? {
          fullName,
          firstName: fullName.trim().split(/\s+/)[0] || fullName,
          initials: emergency?.initials ?? recipient?.initials ?? '?',
          avatarUrl: recipient?.avatarUrl ?? emergency?.avatarUrl ?? null,
          age: emergency?.age ?? null,
          dob: emergency?.dob ?? null,
          bloodType: emergency?.bloodType ?? null,
          conditions: emergency?.conditions ?? [],
          allergies: emergency?.allergies ?? [],
        }
      : null;

    // ---- Today's doses (shared by coordinator card, caregiver, recipient) ----
    const todayDoses: DashboardDose[] = (meds?.doses ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      strength: d.strength,
      purpose: d.purpose,
      time: d.time,
      status: d.status === 'given' ? 'given' : d.status === 'upcoming' ? 'upcoming' : 'missed',
      givenByName: d.givenByName,
    }));
    const medsGivenToday = todayDoses.filter((d) => d.status === 'given').length;
    const nextDoseLabel = todayDoses.find((d) => d.status === 'upcoming')?.time ?? null;

    // ---- Tasks ----
    const allTasks = tasks?.tasks ?? [];
    const openTasks = allTasks.filter((t) => t.status !== 'done').length;
    const tasksDueToday = allTasks.filter((t) => t.status !== 'done' && t.due && isToday(t.due)).length;
    const myTasks = [...allTasks]
      .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.order - b.order)
      .slice(0, 8)
      .map((t) => ({ id: t.id, title: t.title, done: t.status === 'done' }));

    // ---- Appointments (next + today's list) ----
    const upcomingAppts = (appts?.appointments ?? [])
      .filter((a) => a.status !== 'cancelled' && a.start.getTime() >= now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    const nextAppt = upcomingAppts[0];
    const nextAppointment = nextAppt
      ? {
          whenLabel: compactWhen(nextAppt.start),
          title: nextAppt.title,
          subtitle: [nextAppt.title, nextAppt.provider].filter(Boolean).join(' · ') || nextAppt.title,
        }
      : null;
    const todayAppointments = upcomingAppts.slice(0, 3).map((a) => ({
      id: a.id,
      title: a.title,
      provider: a.provider,
      location: a.location,
      whenLabel: friendlyWhen(a.start),
    }));

    // ---- Recent timeline updates ----
    const events = timeline?.events ?? [];
    const recentUpdates: DashboardUpdate[] = events.slice(0, 6).map((e) => ({
      id: e.id,
      type: e.type,
      text: e.summary,
      timeLabel: timeAgo(e.timestamp),
      authorName: e.authorName,
      authorInitials: e.authorInitials,
      authorColor: e.authorColor,
      hearts: e.reactions.length,
    }));

    // ---- Rota: on-call now + fair share this week ----
    const onCallHit = rota ? onCallNow(rota.shifts, now, rota.members) : null;
    const onCall = onCallHit
      ? {
          name: onCallHit.member.name,
          initials: onCallHit.member.initials,
          color: onCallHit.member.color,
          untilLabel: `Until ${to12h(onCallHit.shift.end)}`,
        }
      : null;

    const hoursByMember = new Map<string, number>();
    for (const s of rota?.shifts ?? []) {
      let mins = toMinutes(s.end) - toMinutes(s.start);
      if (mins <= 0) mins += 24 * 60; // overnight wrap
      hoursByMember.set(s.memberId, (hoursByMember.get(s.memberId) ?? 0) + mins / 60);
    }
    const fairShare: DashboardFairShare[] = (rota?.members ?? [])
      .map((m, i) => ({
        name: memberFirstName(m.name),
        hours: Math.round(hoursByMember.get(m.id) ?? 0),
        color: FAIR_SHARE_COLORS[i % FAIR_SHARE_COLORS.length],
      }))
      .filter((m) => m.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    // ---- Vitals (latest + sparkline + clinician trends), all from the health readings ----
    const readings = health?.readings ?? [];
    const bpSeries = readingsFor(readings, 'bp', '7d', now); // sorted oldest → newest
    const glucoseSeries = readingsFor(readings, 'glucose', '7d', now);
    const latestBp = latestReading(readings, 'bp');
    const latestVital = latestBp
      ? {
          value: formatValue('bp', latestBp.value, latestBp.secondary),
          label: 'Blood pressure',
          status: statusOf('bp', latestBp.value, latestBp.secondary, DEFAULT_THRESHOLDS.bp),
        }
      : null;
    const vitalSparkline = bpSeries.slice(-7).map((r) => ({ v: Math.round(r.value) }));
    const latestMood = latestReading(readings, 'mood');
    const moodLabel = latestMood ? moodFace(latestMood.value).label : null;

    // Real decline-detection insight from the vitals (first warning, e.g. weight loss / elevated BP).
    const insight = computeInsights(readings, DEFAULT_THRESHOLDS, now).find((i) => i.tone === 'warning')?.text ?? null;

    const bpTrend = bpSeries.map((r) => ({
      label: format(r.at, 'EEE'),
      sys: Math.round(r.value),
      dia: Math.round(r.secondary ?? 0),
    }));
    const glucoseTrend = glucoseSeries.map((r) => ({ label: format(r.at, 'EEE'), v: Math.round(r.value) }));

    // ---- Week at a glance (banner): med adherence per day, with incident days flagged ----
    const incidentDates = new Set(
      events.filter((e) => e.type === 'incident').map((e) => format(e.timestamp, 'yyyy-MM-dd')),
    );
    const weekAtGlance: WeekDay[] = (meds?.adherence.days ?? []).map((day, i, arr) => {
      const date = new Date(`${day.date}T00:00:00`);
      const dayIsToday = i === arr.length - 1;
      const missed = day.cells.filter((c) => c === 'missed').length;
      const given = day.cells.filter((c) => c === 'given').length;
      let status: DayStatus;
      let label: string;
      if (incidentDates.has(day.date) || missed > 0) {
        status = 'attention';
        label = 'Needed attention';
      } else if (given > 0) {
        status = 'good';
        label = 'Good day';
      } else {
        status = 'unknown';
        label = dayIsToday ? 'Today' : 'No updates';
      }
      return { day: format(date, 'EEE'), status, label: dayIsToday ? 'Today' : label };
    });

    // ---- Clinician lens ----
    const clinicalMeds: DashboardClinicalMed[] = (meds?.meds ?? [])
      .filter((m) => m.active && !m.discontinued)
      .map((m) => ({
        name: m.name,
        strength: m.strength,
        schedule: m.schedule,
        adherence: meds?.adherenceByMed[m.id] ?? null,
      }));
    const incidents: DashboardIncident[] = events
      .filter((e) => e.type === 'incident')
      .slice(0, 4)
      .map((e) => ({
        type: 'Incident',
        severity: e.isUrgent ? 'High' : 'Medium',
        when: incidentWhen(e.timestamp),
        summary: e.summary,
      }));
    const clinicalDocs = (documents?.documents ?? [])
      .filter((d) => d.category === 'medical' || d.category === 'advance-directive')
      .slice(0, 5)
      .map((d) => ({
        title: d.title,
        kind: DOC_KIND_LABEL[d.kind] ?? d.kind.toUpperCase(),
        date: format(d.uploadedAt, 'MMM d, yyyy'),
      }));

    // ---- Banner secondary line + digest ----
    const bannerParts: string[] = [];
    if (moodLabel) bannerParts.push(`Mood: ${moodLabel.toLowerCase()}`);
    if (events[0]) bannerParts.push(`Last update ${timeAgo(events[0].timestamp)} by ${memberFirstName(events[0].authorName)}`);
    const bannerSubtext = bannerParts.join(' · ') || 'Following along';

    const digest = digestRow ? { headline: digestRow.headline, paragraph: digestRow.paragraphs[0] ?? '' } : null;

    const emergencyContact = emergency?.contacts?.[0]
      ? { name: emergency.contacts[0].name, phone: emergency.contacts[0].phone }
      : null;

    serverLog('dashboard', 'getDashboardData', 'success', {
      email: maskEmail(session.user?.email),
      found: true,
      role,
      doses: todayDoses.length,
      tasks: allTasks.length,
      updates: recentUpdates.length,
    });

    return {
      circleId,
      recipient: dashRecipient,
      stats: {
        medsGivenToday,
        medsTotalToday: todayDoses.length,
        nextDoseLabel,
        nextAppointment,
        openTasks,
        tasksDueToday,
        latestVital,
        vitalSparkline,
        moodLabel,
      },
      todayDoses,
      myTasks,
      todayAppointments,
      recentUpdates,
      onCall,
      fairShare,
      weekAtGlance,
      digest,
      bannerSubtext,
      insight,
      clinical: { meds: clinicalMeds, bpTrend, glucoseTrend, incidents, documents: clinicalDocs },
      emergencyContact,
    };
  } catch (err) {
    serverLog('dashboard', 'getDashboardData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
