import 'server-only';

/**
 * Read layer for the Emergency Card — a projection of the care recipient's profile + active
 * medications + emergency contacts + advance directive (Kintwadi-Data-Model.md notes the emergency
 * card is a projection of the recipient row + active meds). Read-only; no mutations.
 *
 * Security (see AGENTS.md): the signed-in path is RLS-scoped via `withAuthedDb()`, pinned to the
 * active circle. The row-fetch + assembly core is exported for the ONE other consumer — the public
 * `/e/<token>` share view (src/lib/emergency-card/share.ts), which runs it on the privileged
 * connection after validating the capability token. Same projection, two authorization models.
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { format } from 'date-fns';
import { auth } from '@/auth';
import { withAuthedDb } from '@/db/dal';
import type { Tx } from '@/db/rls';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog, maskEmail } from '@/lib/log';
import { careRecipientProfile, medication, documents, membership, users } from '@/db/schema';
import { resolveStoredUrl } from '@/lib/storage/s3';
import type {
  EmergencyCardData,
  EmergencyContact,
  EmergencyMed,
} from '@/components/profile/data';

/** An executor the card queries can run against: the RLS Tx or the privileged platform db. */
export type CardDb = Pick<Tx, 'select'>;

/** Roles offered as next-of-kin / emergency contacts on the card (when they have a phone). */
const KIN_ROLES = ['owner', 'family_admin', 'family'];
const ROLE_LABEL: Record<string, string> = {
  owner: 'Coordinator',
  family_admin: 'Family admin',
  family: 'Family',
  caregiver: 'Caregiver',
  read_only: 'Read-only',
  care_recipient: 'Care recipient',
  clinician: 'Clinician',
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ageFrom(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Coerce a stored emergency-contact entry (jsonb, loosely typed) into our shape. */
function toContact(raw: unknown): EmergencyContact | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) return null;
  const role =
    (typeof o.relationship === 'string' && o.relationship) ||
    (typeof o.role === 'string' && o.role) ||
    'Emergency contact';
  const phone = typeof o.phone === 'string' ? o.phone : '';
  return { name, role: String(role), phone };
}

/** The four reads behind the card, against any executor. Query-only, so callers never hold a DB
 *  transaction open across the S3 presign in `assembleEmergencyCard`. */
export async function fetchEmergencyCardRows(dbx: CardDb, circleId: string) {
  const [profile] = await dbx
    .select()
    .from(careRecipientProfile)
    .where(eq(careRecipientProfile.circleId, circleId))
    .limit(1);

  const meds = await dbx
    .select({ name: medication.name, strength: medication.strength })
    .from(medication)
    .where(
      and(
        eq(medication.circleId, circleId),
        eq(medication.isActive, true),
        isNull(medication.discontinuedAt),
        isNull(medication.deletedAt),
      ),
    )
    .orderBy(asc(medication.name));

  const [advanceDoc] = await dbx
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.circleId, circleId),
        eq(documents.category, 'advance-directive'),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  const memberRows = await dbx
    .select({
      role: membership.role,
      name: users.name,
      label: membership.relationshipLabel,
      phone: membership.phone,
    })
    .from(membership)
    .leftJoin(users, eq(users.id, membership.userId))
    .where(
      and(eq(membership.circleId, circleId), eq(membership.status, 'active'), isNull(membership.deletedAt)),
    )
    .orderBy(asc(membership.createdAt));

  return { profile, meds, advanceDoc, memberRows };
}

export type EmergencyCardRows = Awaited<ReturnType<typeof fetchEmergencyCardRows>>;

/** Shape fetched rows into the card projection (resolves the avatar to a presigned URL). */
export async function assembleEmergencyCard(data: EmergencyCardRows): Promise<EmergencyCardData | null> {
  if (!data.profile) return null;

  const p = data.profile;
  const dobDate = p.dateOfBirth ? new Date(`${p.dateOfBirth}T00:00:00`) : null;
  // Resolve the recipient photo (S3 key → short-lived presigned URL; data:/https: pass through),
  // the same source the sidebar's "Switch Circle" avatar uses.
  const avatarUrl = await resolveStoredUrl(p.avatarUrl);
  const meds: EmergencyMed[] = data.meds.map((m) => ({ name: m.name, strength: m.strength ?? '' }));

  // Primary doctor: a clinician member (with their phone, if recorded).
  const clinician = data.memberRows.find((m) => m.role === 'clinician' && m.name);
  const doctor: EmergencyContact | null = clinician
    ? { name: clinician.name!, role: clinician.label ?? 'Clinician', phone: clinician.phone ?? '' }
    : null;

  // Next-of-kin: explicit profile contacts first, then family members who have a phone on file.
  const jsonContacts: EmergencyContact[] = Array.isArray(p.emergencyContacts)
    ? p.emergencyContacts.map(toContact).filter((c): c is EmergencyContact => c !== null)
    : [];
  const memberContacts: EmergencyContact[] = data.memberRows
    .filter((m) => m.name && m.phone && KIN_ROLES.includes(m.role))
    .map((m) => ({ name: m.name!, role: m.label || ROLE_LABEL[m.role] || 'Family', phone: m.phone! }));

  const seen = new Set<string>();
  const contacts: EmergencyContact[] = [...jsonContacts, ...memberContacts].filter((c) => {
    const key = (c.phone || c.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    fullName: p.fullName,
    initials: initialsFrom(p.fullName),
    avatarUrl,
    age: dobDate ? ageFrom(dobDate) : null,
    dob: dobDate ? format(dobDate, 'd MMMM yyyy') : null,
    bloodType: p.bloodType ?? null,
    allergies: Array.isArray(p.allergies) ? (p.allergies as string[]) : [],
    conditions: Array.isArray(p.conditions) ? (p.conditions as string[]) : [],
    advanceDirective: p.advanceDirective?.trim() || (data.advanceDoc ? 'On file' : null),
    meds,
    contacts,
    doctor,
  };
}

/** Assemble the Emergency Card for the active circle. Null if unauthenticated / no active circle. */
export async function getEmergencyCardData(): Promise<EmergencyCardData | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const circleId = await getActiveCircleId();
    if (!circleId) {
      serverLog('emergency', 'getEmergencyCardData', 'success', { email: maskEmail(session.user?.email), found: false });
      return null;
    }

    const rows = await withAuthedDb((tx) => fetchEmergencyCardRows(tx, circleId));
    const card = await assembleEmergencyCard(rows);

    serverLog('emergency', 'getEmergencyCardData', 'success', {
      email: maskEmail(session.user?.email),
      found: card !== null,
      meds: card?.meds.length ?? 0,
      contacts: card?.contacts.length ?? 0,
    });
    return card;
  } catch (err) {
    serverLog('emergency', 'getEmergencyCardData', 'failure', {
      email: maskEmail(session.user?.email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
    return null;
  }
}
