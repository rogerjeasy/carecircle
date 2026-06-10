import 'server-only';

/**
 * Read layer for the care recipient's Profile screen — the recipient's real profile row, their
 * active medications, and key contacts. Reuses `getEmergencyCardData()` (contacts + doctor + the
 * clinical basics) and `getMedicationsData()` (med schedules), and reads the remaining profile
 * fields (mobility, dietary, preferences, language, insurance) directly.
 *
 * Security (see AGENTS.md): everything goes through RLS-scoped readers / `withAuthedDb()`, pinned to
 * the active circle. Reading one's own recipient profile is normal app data → operational `serverLog`.
 */
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import { resolveActiveMembership } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { careRecipientProfile } from '@/db/schema';
import { getEmergencyCardData } from '@/lib/emergency-card/queries';
import { getMedicationsData } from '@/lib/medications/queries';

export interface ProfileContact {
  name: string;
  role: string;
  phone: string;
}
export interface ProfileMed {
  name: string;
  strength: string;
  schedule: string;
}
export interface ProfileInsurance {
  provider: string;
  plan: string;
  memberId: string;
  group: string;
}

export interface RecipientProfileData {
  circleId: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  age: number | null;
  /** Display DOB, e.g. "12 March 1948". */
  dob: string | null;
  /** DOB as yyyy-MM-dd for the edit form's date input. */
  dobInput: string | null;
  language: string | null;
  bloodType: string | null;
  mobility: string | null;
  dietary: string[];
  conditions: string[];
  allergies: string[];
  advanceDirective: string | null;
  /** Free-text care/comfort notes (the recipient profile's `preferences`). */
  comfort: string | null;
  meds: ProfileMed[];
  doctors: ProfileContact[];
  nextOfKin: ProfileContact[];
  insurance: ProfileInsurance | null;
  /** Whether the caller may edit the profile (coordinators + family). */
  canEdit: boolean;
}

const EDIT_ROLES = new Set(['owner', 'family_admin', 'family']);

/** Coerce a loosely-typed stored insurance blob into our shape (or null). */
function toInsurance(raw: unknown): ProfileInsurance | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
  const provider = str(o.provider);
  const plan = str(o.plan);
  const memberId = str(o.memberId ?? o.member_id);
  const group = str(o.group);
  if (!provider && !plan && !memberId && !group) return null;
  return { provider, plan, memberId, group };
}

/** Load the active circle's recipient profile for the Profile screen. Null if unauth / no recipient. */
export async function getRecipientProfile(): Promise<RecipientProfileData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const active = await resolveActiveMembership();
    if (!active) {
      serverLog('profile', 'getRecipientProfile', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const [emergency, medsData, row] = await Promise.all([
      getEmergencyCardData(),
      getMedicationsData(),
      withAuthedDb((tx) =>
        tx
          .select({
            mobility: careRecipientProfile.mobility,
            dietaryNeeds: careRecipientProfile.dietaryNeeds,
            preferences: careRecipientProfile.preferences,
            primaryLanguage: careRecipientProfile.primaryLanguage,
            dateOfBirth: careRecipientProfile.dateOfBirth,
            insuranceSummary: careRecipientProfile.insuranceSummary,
          })
          .from(careRecipientProfile)
          .where(eq(careRecipientProfile.circleId, active.circleId))
          .limit(1)
          .then((r) => r[0]),
      ),
    ]);

    if (!emergency) {
      serverLog('profile', 'getRecipientProfile', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const meds: ProfileMed[] = (medsData?.meds ?? [])
      .filter((m) => m.active && !m.discontinued)
      .map((m) => ({ name: m.name, strength: m.strength, schedule: m.schedule }));

    const dietary = (row?.dietaryNeeds ?? '')
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    serverLog('profile', 'getRecipientProfile', 'success', { email: maskEmail(session.user?.email), found: true });
    return {
      circleId: active.circleId,
      fullName: emergency.fullName,
      initials: emergency.initials,
      avatarUrl: emergency.avatarUrl,
      age: emergency.age,
      dob: emergency.dob,
      dobInput: row?.dateOfBirth ?? null,
      language: row?.primaryLanguage ?? null,
      bloodType: emergency.bloodType,
      mobility: row?.mobility ?? null,
      dietary,
      conditions: emergency.conditions,
      allergies: emergency.allergies,
      advanceDirective: emergency.advanceDirective,
      comfort: row?.preferences ?? null,
      meds,
      doctors: emergency.doctor ? [emergency.doctor] : [],
      nextOfKin: emergency.contacts,
      insurance: toInsurance(row?.insuranceSummary),
      canEdit: EDIT_ROLES.has(active.role),
    };
  } catch (err) {
    serverLog('profile', 'getRecipientProfile', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
