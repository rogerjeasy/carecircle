'use server';

/**
 * Care recipient profile — update the editable profile fields shown on the Profile screen.
 *
 * Security (see AGENTS.md — fail-closed): re-checks `requireSession()` + the user's REAL role in the
 * active circle (coordinators + family may edit; the careRecipientProfile RLS policy is the backstop).
 * Runs through `withAuthedDb()` and is audited. Free text rides in FormData.
 */
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { recordAuditEvent } from '@/db/audit';
import { getActiveCircleId } from '@/lib/circle/active-circle';
import { serverLog } from '@/lib/log';
import { careRecipientProfile, membership } from '@/db/schema';

export type SimpleResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const FORBIDDEN = 'You do not have permission to do that.';
const EDIT_ROLES = new Set(['owner', 'family_admin', 'family']);

async function getActorRole(): Promise<{ userId: string; circleId: string; role: string } | null> {
  const user = await requireSession();
  const circleId = await getActiveCircleId();
  if (!circleId) return null;
  const [m] = await withAuthedDb((tx) =>
    tx
      .select({ role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.circleId, circleId),
          eq(membership.userId, user.id),
          eq(membership.status, 'active'),
          isNull(membership.deletedAt),
        ),
      )
      .limit(1),
  );
  if (!m) return null;
  return { userId: user.id, circleId, role: m.role };
}

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Please enter a name').max(120),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  language: z.string().trim().max(60).optional().default(''),
  bloodType: z.string().trim().max(10).optional().default(''),
  mobility: z.string().trim().max(300).optional().default(''),
  dietary: z.string().trim().max(500).optional().default(''),
  comfort: z.string().trim().max(2000).optional().default(''),
});

function read(formData: FormData): unknown {
  return {
    fullName: formData.get('fullName')?.toString() ?? '',
    dob: formData.get('dob')?.toString() ?? '',
    language: formData.get('language')?.toString() ?? '',
    bloodType: formData.get('bloodType')?.toString() ?? '',
    mobility: formData.get('mobility')?.toString() ?? '',
    dietary: formData.get('dietary')?.toString() ?? '',
    comfort: formData.get('comfort')?.toString() ?? '',
  };
}

/** Update the recipient's editable profile fields. */
export async function updateRecipientProfile(formData: FormData): Promise<SimpleResult> {
  const ctx = await getActorRole();
  serverLog('profile', 'updateRecipient', 'start', { actor: ctx?.userId });
  if (!ctx) return { ok: false, error: 'No active care circle.' };
  if (!EDIT_ROLES.has(ctx.role)) {
    serverLog('profile', 'updateRecipient', 'failure', { actor: ctx.userId, reason: 'forbidden' });
    return { ok: false, error: FORBIDDEN };
  }
  const parsed = profileSchema.safeParse(read(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the details.' };
  const p = parsed.data;

  try {
    await withAuthedDb(async (tx) => {
      const [row] = await tx
        .update(careRecipientProfile)
        .set({
          fullName: p.fullName,
          dateOfBirth: p.dob || null,
          primaryLanguage: p.language || null,
          bloodType: p.bloodType || null,
          mobility: p.mobility || null,
          dietaryNeeds: p.dietary || null,
          preferences: p.comfort || null,
          updatedAt: new Date(),
        })
        .where(eq(careRecipientProfile.circleId, ctx.circleId))
        .returning({ id: careRecipientProfile.id });
      if (!row) throw new Error('not_found');
      await recordAuditEvent(
        ctx.userId,
        { circleId: ctx.circleId, action: 'update', entityType: 'recipient', entityId: row.id, summary: 'Updated the care recipient profile' },
        tx,
      );
    });
    serverLog('profile', 'updateRecipient', 'success', { actor: ctx.userId });
    return { ok: true };
  } catch (err) {
    serverLog('profile', 'updateRecipient', 'failure', { actor: ctx.userId, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
