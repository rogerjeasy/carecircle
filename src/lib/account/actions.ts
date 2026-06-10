'use server';

/**
 * Account settings server actions — the signed-in user's OWN identity + preferences.
 *
 * These touch the identity tables (`user`), which carry NO Row-Level Security (the Auth.js adapter
 * owns them), so — like src/lib/auth/actions.ts — they use the base `db` and pin every query to the
 * authenticated `user.id` from the verified session (never a client-supplied id).
 *
 * Security (see AGENTS.md): re-checks `requireSession()`; free-text + secrets ride in FormData so
 * Next's dev logger can't print them; logs use `maskEmail()` and never the password. Profile/password
 * changes aren't circle-scoped tenant data, so they emit operational `serverLog` only (no audit row).
 */
import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { requireSession, withAuthedDb } from '@/db/dal';
import { users, membership } from '@/db/schema';
import { hashPassword, verifyPassword } from '@/lib/password';
import { uploadImageDataUrl, resolveStoredUrl } from '@/lib/storage/s3';
import { signOut } from '@/auth';
import { serverLog, maskEmail } from '@/lib/log';

export type SimpleResult = { ok: true } | { ok: false; error: string };
const GENERIC_ERROR = 'Something went wrong. Please try again.';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export interface AccountSettings {
  name: string;
  email: string;
  /** Resolved (presigned) avatar URL, or null. */
  image: string | null;
  language: string;
  timezone: string;
  /** False for OAuth-only accounts (no password to change). */
  hasPassword: boolean;
}

export type LoadAccountResult = { ok: true; account: AccountSettings } | { ok: false; error: string };

/** Load the signed-in user's account details + preferences. */
export async function loadAccountSettings(): Promise<LoadAccountResult> {
  const user = await requireSession();
  try {
    const [row] = await db
      .select({
        name: users.name,
        email: users.email,
        image: users.image,
        language: users.language,
        timezone: users.timezone,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!row) return { ok: false, error: 'Account not found.' };
    serverLog('account', 'loadSettings', 'success', { email: maskEmail(row.email) });
    return {
      ok: true,
      account: {
        name: row.name ?? '',
        email: row.email,
        image: await resolveStoredUrl(row.image),
        language: row.language ?? 'English',
        timezone: row.timezone ?? 'UTC',
        hasPassword: Boolean(row.passwordHash),
      },
    };
  } catch (err) {
    serverLog('account', 'loadSettings', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(100),
  language: z.string().trim().max(40),
  timezone: z.string().trim().max(60),
});

export type UpdateProfileResult = { ok: true; image: string | null } | { ok: false; error: string };

/** Update name / language / timezone, and optionally the avatar photo (a `data:` image URL). */
export async function updateAccountProfile(formData: FormData): Promise<UpdateProfileResult> {
  const user = await requireSession();
  serverLog('account', 'updateProfile', 'start', { actor: user.id });
  const parsed = profileSchema.safeParse({
    name: formData.get('name')?.toString() ?? '',
    language: formData.get('language')?.toString() ?? '',
    timezone: formData.get('timezone')?.toString() ?? '',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check your details.' };

  try {
    // Optional new photo → private S3 'avatars' prefix (partitioned by the user id). Best-effort:
    // a failed upload just leaves the existing photo unchanged.
    let imageKey: string | null = null;
    const photo = formData.get('photo');
    if (typeof photo === 'string' && photo.startsWith('data:')) {
      imageKey = await uploadImageDataUrl({ circleId: user.id, category: 'avatars', dataUrl: photo, datePartition: false });
    }

    await db
      .update(users)
      .set({
        name: parsed.data.name,
        language: parsed.data.language || null,
        timezone: parsed.data.timezone || null,
        ...(imageKey ? { image: imageKey } : {}),
      })
      .where(eq(users.id, user.id));

    serverLog('account', 'updateProfile', 'success', { actor: user.id, photo: Boolean(imageKey) });
    // Return the resolved URL of the (possibly new) photo so the client can refresh the avatar.
    const resolved = imageKey ? await resolveStoredUrl(imageKey) : (user.image ?? null);
    return { ok: true, image: resolved };
  } catch (err) {
    serverLog('account', 'updateProfile', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Change the password for a credentials account: verify the current one, then set the new hash. */
export async function changePassword(formData: FormData): Promise<SimpleResult> {
  const user = await requireSession();
  serverLog('account', 'changePassword', 'start', { actor: user.id });

  const current = formData.get('current')?.toString() ?? '';
  const next = passwordRule.safeParse(formData.get('next')?.toString() ?? '');
  const confirm = formData.get('confirm')?.toString() ?? '';
  if (!next.success) return { ok: false, error: next.error.issues[0]?.message ?? 'Your new password is invalid.' };
  if (next.data !== confirm) return { ok: false, error: "New passwords don't match." };

  try {
    const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!row?.passwordHash) {
      return { ok: false, error: 'Your account signs in with a provider, so there is no password to change.' };
    }
    if (!(await verifyPassword(current, row.passwordHash))) {
      serverLog('account', 'changePassword', 'failure', { actor: user.id, reason: 'bad_current' });
      return { ok: false, error: 'Your current password is incorrect.' };
    }
    await db.update(users).set({ passwordHash: await hashPassword(next.data) }).where(eq(users.id, user.id));
    serverLog('account', 'changePassword', 'success', { actor: user.id });
    return { ok: true };
  } catch (err) {
    serverLog('account', 'changePassword', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Delete the signed-in user's account. Guard: refuse if they're the sole coordinator (owner) of a
 * circle that still has OTHER active members — they must transfer ownership or remove members first,
 * so a shared circle is never orphaned. Otherwise delete the `user` row (FK cascade removes their
 * memberships, sessions and OAuth links) and end the session.
 */
export async function deleteAccount(): Promise<SimpleResult> {
  const user = await requireSession();
  serverLog('account', 'deleteAccount', 'start', { actor: user.id });
  try {
    // Read the user's OWN owner memberships under RLS, and whether each circle has other members.
    const blocked = await withAuthedDb(async (tx) => {
      const owned = await tx
        .select({ circleId: membership.circleId })
        .from(membership)
        .where(and(eq(membership.userId, user.id), eq(membership.role, 'owner'), eq(membership.status, 'active')));
      for (const o of owned) {
        const [other] = await tx
          .select({ id: membership.id })
          .from(membership)
          .where(
            and(eq(membership.circleId, o.circleId), eq(membership.status, 'active'), ne(membership.userId, user.id)),
          )
          .limit(1);
        if (other) return true; // a shared circle this user owns → block
      }
      return false;
    });
    if (blocked) {
      serverLog('account', 'deleteAccount', 'failure', { actor: user.id, reason: 'sole_owner' });
      return {
        ok: false,
        error: "You're the coordinator of a circle with other members. Transfer ownership (or remove the others) before deleting your account.",
      };
    }

    // Identity table (no RLS) → base db; cascade FKs clean up membership/session/account rows.
    await db.delete(users).where(eq(users.id, user.id));
    serverLog('account', 'deleteAccount', 'success', { actor: user.id });
    await signOut({ redirect: false });
    return { ok: true };
  } catch (err) {
    serverLog('account', 'deleteAccount', 'failure', { actor: user.id, reason: (err as Error)?.name ?? 'error' });
    return { ok: false, error: GENERIC_ERROR };
  }
}
