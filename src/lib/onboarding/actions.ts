'use server';

/**
 * Onboarding server action — turns the multi-step wizard into a real care circle.
 *
 * Security (see AGENTS.md):
 *  - Re-checks auth itself via `requireSession()` (never trusts the client or the layout/proxy).
 *  - All tenant writes go through `withAuthedDb()` so Aurora Row-Level Security applies.
 *  - The brand-new tenant is bootstrapped by the `provision_care_circle()` SECURITY DEFINER
 *    function (drizzle/0005): a fresh user has no membership yet, so the RLS-bound app role
 *    cannot create the first circle + owner membership. The function does exactly — and only —
 *    that, for the *currently authenticated* user, after which every later write in the same
 *    transaction (recipient profile, timeline, invitations) flows through normal RLS.
 *  - Every state-changing step is audited via `recordAuditEvent()` inside the same transaction.
 */
import { z } from 'zod';
import { sql, eq } from 'drizzle-orm';
import { requireSession, withAuthedDb } from '@/db/dal';
import { careRecipientProfile, timelineEvent, invitation } from '@/db/schema';
import { getAppOrigin } from '@/lib/url';
import { recordAuditEvent } from '@/db/audit';
import { randomToken, hashToken } from '@/lib/auth/tokens';
import { sendInvitationEmail, sendWelcomeEmail } from '@/lib/email';
import { uploadImageDataUrl } from '@/lib/storage/s3';
import { serverLog } from '@/lib/log';
import { revalidateCareViews } from '@/lib/revalidate';

export type OnboardingResult =
  | { ok: true; circleId: string; invitesSent: number }
  | { ok: false; error: string };

// Roles the onboarding wizard can assign. These are the schema's role enum values
// minus `owner` (the inviter is this circle's owner/coordinator — you don't invite one).
const INVITE_ROLES = [
  'family_admin',
  'family',
  'caregiver',
  'clinician',
  'care_recipient',
  'read_only',
] as const;

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Generous ceiling for a client-downscaled avatar data URL (~tens of KB in practice). Anything
// larger is dropped rather than rejected, so onboarding never fails over a photo.
const MAX_AVATAR_CHARS = 1_500_000;

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(INVITE_ROLES),
});

const onboardingSchema = z.object({
  recipientName: z.string().trim().min(1, 'A name is required').max(120),
  recipientDateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  recipientPhoto: z.string().nullable().optional(),
  relationship: z.string().trim().max(60).optional().or(z.literal('')),
  conditions: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  allergies: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  primaryLanguage: z.string().trim().max(60).optional().or(z.literal('')),
  timezone: z.string().trim().min(1).max(60),
  invites: z.array(inviteSchema).max(50).default([]),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;

/**
 * Rebuild the onboarding payload from the `FormData` the wizard submits. We take FormData (not a
 * plain object) so Next's dev server never logs the raw health PII the wizard carries (conditions,
 * allergies, DOB, invitee emails) — see AGENTS.md. Array/nested fields ride along as JSON strings;
 * the zod schema below is the real validation, so malformed JSON just degrades to an empty list.
 */
function readOnboardingFormData(formData: FormData): OnboardingInput {
  const str = (key: string) => (formData.get(key) ?? '').toString();
  const jsonArray = (key: string): unknown[] => {
    const raw = formData.get(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw.toString());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return {
    recipientName: str('recipientName'),
    recipientDateOfBirth: str('recipientDateOfBirth'),
    recipientPhoto: formData.get('recipientPhoto')?.toString() ?? null,
    relationship: str('relationship'),
    conditions: jsonArray('conditions') as string[],
    allergies: jsonArray('allergies') as string[],
    primaryLanguage: str('primaryLanguage'),
    timezone: str('timezone'),
    invites: jsonArray('invites') as OnboardingInput['invites'],
  };
}

/**
 * Classify the photo the wizard submitted. An external `https://` URL is trusted and stored
 * as-is; a `data:` URL (what the in-browser downscaler produces) is uploaded to S3 *after* the
 * circle is created — so the object key can be partitioned under its `circleId` — and the key
 * backfilled onto the profile. Anything else is dropped (treated as "no photo").
 */
function classifyPhoto(photo: string | null | undefined): {
  externalUrl: string | null;
  dataUrl: string | null;
} {
  if (!photo || photo.length > MAX_AVATAR_CHARS) return { externalUrl: null, dataUrl: null };
  if (/^https?:\/\//i.test(photo)) return { externalUrl: photo, dataUrl: null };
  if (/^data:image\//i.test(photo)) return { externalUrl: null, dataUrl: photo };
  return { externalUrl: null, dataUrl: null };
}

/**
 * Create the care circle from the onboarding wizard, then dispatch any invitations.
 * Returns the new circle id (the client redirects to the dashboard) or a friendly error.
 */
export async function completeOnboarding(formData: FormData): Promise<OnboardingResult> {
  const user = await requireSession();
  const userId = user.id;

  serverLog('onboarding', 'completeOnboarding', 'start', { actor: userId });

  const parsed = onboardingSchema.safeParse(readOnboardingFormData(formData));
  if (!parsed.success) {
    serverLog('onboarding', 'completeOnboarding', 'failure', { actor: userId, reason: 'validation' });
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the details you entered.' };
  }
  const data = parsed.data;

  // Drop blank-email rows the wizard may leave behind, then de-dupe by email (keep the first).
  const seen = new Set<string>();
  const invites = data.invites
    .map((i) => ({ email: i.email.toLowerCase(), role: i.role }))
    .filter((i) => i.email && !seen.has(i.email) && seen.add(i.email));

  const circleName = `${data.recipientName}'s Care`;
  // External URLs are stored immediately; data: URLs are uploaded to S3 after commit (below).
  const { externalUrl, dataUrl: photoDataUrl } = classifyPhoto(data.recipientPhoto);
  const dob = data.recipientDateOfBirth && data.recipientDateOfBirth !== '' ? data.recipientDateOfBirth : null;

  // Tokens are minted before the transaction so we can email them after it commits.
  const issued = invites.map((i) => ({ ...i, token: randomToken() }));

  let circleId: string;
  try {
    circleId = await withAuthedDb(async (tx) => {
      // 1) Bootstrap the tenant + first owner membership (RLS-exempt, current-user-only).
      const rows = (await tx.execute(
        sql`select circle_id, membership_id
            from provision_care_circle(${circleName}, ${data.timezone}, ${data.relationship || null})`,
      )) as unknown as Array<{ circle_id: string; membership_id: string }>;
      const provisioned = rows[0];
      if (!provisioned?.circle_id) throw new Error('provisioning returned no circle');
      const { circle_id: cId, membership_id: ownerMembershipId } = provisioned;

      // 2) The person at the center of the circle (now allowed: the user is this circle's owner).
      await tx.insert(careRecipientProfile).values({
        circleId: cId,
        fullName: data.recipientName,
        dateOfBirth: dob,
        avatarUrl: externalUrl,
        conditions: data.conditions,
        allergies: data.allergies,
        primaryLanguage: data.primaryLanguage || null,
      });

      // 3) Seed the activity stream so the dashboard/timeline opens with a real first event.
      await tx.insert(timelineEvent).values({
        circleId: cId,
        actorMembershipId: ownerMembershipId,
        eventType: 'system',
        summary: `${data.recipientName}'s care circle was created.`,
        visibility: 'all',
      });

      // 4) Persist invitations (the /invite/<token> links the emails point at).
      // 🔒 Only the token's SHA-256 is stored (drizzle/0045) — the raw secret exists in the
      // emailed link alone, so a DB leak never yields working join links.
      if (issued.length > 0) {
        await tx.insert(invitation).values(
          issued.map((i) => ({
            circleId: cId,
            email: i.email,
            role: i.role,
            token: hashToken(i.token),
            invitedByMembershipId: ownerMembershipId,
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          })),
        );
      }

      // 5) Audit — atomically with the writes above (same tx). No PII in summaries.
      await recordAuditEvent(
        userId,
        { circleId: cId, action: 'create', entityType: 'care_circle', entityId: cId, summary: 'Created care circle' },
        tx,
      );
      for (const i of issued) {
        await recordAuditEvent(
          userId,
          { circleId: cId, action: 'invite', entityType: 'invitation', summary: `Invited a ${i.role}` },
          tx,
        );
      }

      return cId;
    });
  } catch (err) {
    serverLog('onboarding', 'completeOnboarding', 'failure', {
      actor: userId,
      reason: (err as Error)?.name ?? 'error',
    });
    return { ok: false, error: "We couldn't finish setting up your circle. Please try again." };
  }

  serverLog('onboarding', 'completeOnboarding', 'success', {
    actor: userId,
    circleId,
    invites: issued.length,
  });
  revalidateCareViews();

  // Upload the recipient photo to S3 now that the circle exists, so the object key is partitioned
  // under its `circleId`, then backfill the key onto the profile. Best-effort, like the emails
  // below: a storage hiccup must never undo a successfully-created circle, and onboarding never
  // fails over a photo. One photo per circle, so no date partition (no hot-prefix risk).
  if (photoDataUrl) {
    try {
      const avatarKey = await uploadImageDataUrl({
        circleId,
        category: 'recipient-photos',
        dataUrl: photoDataUrl,
        datePartition: false,
      });
      if (avatarKey) {
        await withAuthedDb(async (tx) => {
          await tx
            .update(careRecipientProfile)
            .set({ avatarUrl: avatarKey })
            .where(eq(careRecipientProfile.circleId, circleId));
          // Audit the profile mutation atomically with the backfill (no PII in the summary).
          await recordAuditEvent(
            userId,
            {
              circleId,
              action: 'update',
              entityType: 'care_recipient_profile',
              summary: 'Uploaded recipient photo',
            },
            tx,
          );
        });
        serverLog('onboarding', 'uploadRecipientPhoto', 'success', { actor: userId, circleId });
      } else {
        serverLog('onboarding', 'uploadRecipientPhoto', 'failure', { actor: userId, circleId, reason: 'upload_skipped' });
      }
    } catch (err) {
      serverLog('onboarding', 'uploadRecipientPhoto', 'failure', {
        actor: userId,
        circleId,
        reason: (err as Error)?.name ?? 'error',
      });
    }
  }

  // Emails are best-effort and happen AFTER the circle is committed — a delivery hiccup must
  // never roll back a successfully-created circle. (No provider configured → logged to console.)
  const origin = await getAppOrigin();
  const inviterName = user.name?.trim() || 'A family member';

  // Welcome the owner who just set everything up.
  if (user.email) {
    try {
      await sendWelcomeEmail({
        to: user.email,
        recipientName: data.recipientName,
        dashboardUrl: `${origin}/dashboard`,
      });
    } catch (err) {
      console.error('[onboarding] welcome email failed:', (err as Error)?.name ?? 'error');
    }
  }

  // Fan out the circle invitations.
  let invitesSent = 0;
  if (issued.length > 0) {
    const results = await Promise.allSettled(
      issued.map((i) =>
        sendInvitationEmail({
          to: i.email,
          inviteUrl: `${origin}/invite/${i.token}`,
          inviterName,
          recipientName: data.recipientName,
          role: i.role,
        }),
      ),
    );
    invitesSent = results.filter((r) => r.status === 'fulfilled').length;
  }

  return { ok: true, circleId, invitesSent };
}
