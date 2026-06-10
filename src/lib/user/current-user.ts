'use server';

/**
 * Resolves the REAL signed-in user for the app shell — this replaces the former hardcoded
 * "Maria Santos / Coordinator" placeholder in the sidebar, mobile nav, and dashboard greeting.
 *
 * Security (see AGENTS.md):
 *  - Identity (name / email / avatar) comes from the verified Auth.js session, never the client.
 *  - The role is THIS user's membership role in the ACTIVE circle (cookie-backed, validated by
 *    `resolveActiveMembership()`), read under RLS — so it can never reveal another tenant's data,
 *    and it follows the circle the user has switched to.
 *  - Operational `serverLog` on the success and failure paths; no audit_log row is written
 *    because reading one's own name/role is not a sensitive cross-tenant view.
 */
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { serverLog, maskEmail } from '@/lib/log';
import { resolveActiveMembership } from '@/lib/circle/active-circle';
import { resolveStoredUrl } from '@/lib/storage/s3';
import { dbRoleToUiRole, uiRoleLabel } from '@/lib/circle/roles';
import type { UserRole } from '@/components/app-shell/app-shell-context';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** Two-letter monogram for the avatar fallback. */
  initials: string;
  /** UI role vocabulary used for nav visibility / role-aware views, in the active circle. */
  role: UserRole;
  /** Human label shown under the user's name (e.g. "Coordinator"). */
  roleLabel: string;
  /** The active circle (cookie-resolved), or null if the user has no circle yet. */
  circleId: string | null;
  circleName: string | null;
}

/** Derive a two-letter monogram from a name (falling back to the email local-part). */
function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.split('@')[0] || '';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The real, signed-in user for the current request, or `null` if unauthenticated. The role +
 * circle reflect the ACTIVE circle, so they change when the user switches circles. Safe to call
 * from a client component (it is a server action): only serializable profile fields cross over.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const sessionUser = session?.user;
  const userId = sessionUser?.id;
  if (!userId) {
    return null;
  }

  const name = sessionUser.name?.trim() || '';
  const email = sessionUser.email ?? '';

  // The avatar is sourced from the DB `user.image` (where a photo uploaded in Settings is stored as
  // a private S3 key), resolved to a viewable URL — NOT the JWT's `image`, which is set at sign-in
  // and wouldn't reflect a later photo change. Falls back to the session image (e.g. an OAuth photo).
  let image: string | null = sessionUser.image ?? null;
  try {
    const [row] = await db.select({ image: users.image }).from(users).where(eq(users.id, userId)).limit(1);
    image = (await resolveStoredUrl(row?.image)) ?? sessionUser.image ?? null;
  } catch {
    /* identity read failed — keep the session image */
  }

  // Sensible defaults so the shell still works for a user who has signed in but not yet
  // onboarded into a circle (no membership row yet).
  let role: UserRole = 'coordinator';
  let roleLabel = uiRoleLabel(role);
  let circleId: string | null = null;
  let circleName: string | null = null;

  try {
    const active = await resolveActiveMembership();
    if (active) {
      role = dbRoleToUiRole(active.role);
      roleLabel = uiRoleLabel(role);
      circleId = active.circleId;
      circleName = active.circleName;
    }

    serverLog('user', 'getCurrentUser', 'success', {
      email: maskEmail(email),
      role,
      hasCircle: Boolean(circleId),
    });
  } catch (err) {
    // Identity is still valid even if the membership lookup fails; fall back to defaults.
    serverLog('user', 'getCurrentUser', 'failure', {
      email: maskEmail(email),
      reason: (err as { code?: string })?.code ?? (err as Error)?.name ?? 'error',
    });
  }

  return {
    id: userId,
    name,
    email,
    image,
    initials: initialsFrom(name, email),
    role,
    roleLabel,
    circleId,
    circleName,
  };
}
