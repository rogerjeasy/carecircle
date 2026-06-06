'use server';

/**
 * Authentication server actions — the real logic behind the auth screens.
 * Each returns a serializable result the client can render (inline error + toast), except
 * social sign-in which redirects. Identity tables have no RLS, so these use the base `db`.
 */
import { z } from 'zod';
import { sql, eq } from 'drizzle-orm';
import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { hashPassword } from '@/lib/password';
import { randomToken, hashToken } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { signIn, signOut, authProviders, auth } from '@/auth';
import { isPlatformAdminEmail } from '@/lib/admin/access';
import { serverLog, maskEmail } from '@/lib/log';

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Where a freshly-signed-in user should land. Platform admins (email allowlist) go straight to
 * the cross-tenant `/admin` console; everyone else to their own `/dashboard`. The email is read
 * from the verified server session, so the destination can't be spoofed by the client. Called
 * from the client AFTER sign-in succeeds (the session cookie isn't yet readable within the same
 * request as `signIn`).
 */
export async function resolveLandingPath(): Promise<string> {
  const session = await auth();
  if (isPlatformAdminEmail(session?.user?.email)) {
    return '/admin';
  }
  return '/dashboard';
}

// ---------------------------------------------------------------------------
// Sign out — destroys the session server-side, then redirects to sign-in.
// ---------------------------------------------------------------------------
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/sign-in' });
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[0-9]/, 'Include at least one number');

// ---------------------------------------------------------------------------
// Sign up (email + password)
// ---------------------------------------------------------------------------
const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name').max(100, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: passwordRule,
});

export async function signUpWithCredentials(formData: FormData): Promise<ActionResult> {
  // Read from FormData (not a plain object) so Next's dev server never logs the raw password.
  const parsed = signUpSchema.safeParse({
    fullName: (formData.get('fullName') ?? '').toString(),
    email: (formData.get('email') ?? '').toString(),
    password: (formData.get('password') ?? '').toString(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check your details.' };
  }
  const email = parsed.data.email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  if (existing) {
    serverLog('auth', 'signUp', 'failure', { email: maskEmail(email), reason: 'already_exists' });
    return { ok: false, error: 'An account with this email already exists. Try signing in.' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.insert(users).values({ name: parsed.data.fullName, email, passwordHash });
  serverLog('auth', 'signUp', 'success', { email: maskEmail(email) });

  // Auto sign-in so the user lands in onboarding already authenticated.
  try {
    await signIn('credentials', { email, password: parsed.data.password, redirect: false });
  } catch {
    // The account exists; if auto sign-in hiccups, the client falls back to the sign-in page.
    serverLog('auth', 'signUp.autoSignIn', 'failure', { email: maskEmail(email) });
    return { ok: false, error: 'Account created. Please sign in to continue.' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Sign in (email + password)
// ---------------------------------------------------------------------------
const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function signInWithCredentials(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: (formData.get('email') ?? '').toString(),
    password: (formData.get('password') ?? '').toString(),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email and password.' };
  }
  const email = parsed.data.email.toLowerCase();
  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirect: false,
    });
    // Note: a successful login is also recorded to the per-circle audit_log via the Auth.js
    // `signIn` event (see src/auth.ts → recordLoginEvent). This is the operational log line.
    serverLog('auth', 'signIn', 'success', { email: maskEmail(email) });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      serverLog('auth', 'signIn', 'failure', { email: maskEmail(email), reason: 'bad_credentials' });
      return { ok: false, error: 'Invalid email or password. Please try again.' };
    }
    serverLog('auth', 'signIn', 'failure', { email: maskEmail(email), reason: 'error' });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Social sign-in (Google / Apple) — redirects on success.
// ---------------------------------------------------------------------------
export async function socialSignIn(
  provider: 'google' | 'apple',
  callbackUrl?: string,
): Promise<ActionResult> {
  if (!authProviders[provider]) {
    return {
      ok: false,
      error: `${provider === 'google' ? 'Google' : 'Apple'} sign-in isn't configured yet.`,
    };
  }
  // Throws NEXT_REDIRECT to navigate to the provider — that's the success path.
  await signIn(provider, { redirectTo: callbackUrl || '/dashboard' });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Forgot password — issue a one-time reset link.
// ---------------------------------------------------------------------------
async function appOrigin(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = z.string().trim().email().safeParse((formData.get('email') ?? '').toString());
  if (!parsed.success) return { ok: false, error: 'Please enter a valid email address.' };
  const email = parsed.data.toLowerCase();

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  // Respond identically whether or not the account exists — no account enumeration.
  if (user) {
    const token = randomToken();
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });
    const origin = await appOrigin();
    const resetUrl = `${origin}/reset-password?token=${token}&uid=${user.id}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      console.error('[auth] failed to send reset email:', (err as Error)?.name ?? 'error');
    }
  }
  // Log without revealing existence to the client (response is identical either way); the
  // `found` flag stays in server logs only, never in the API response — no account enumeration.
  serverLog('auth', 'requestPasswordReset', 'success', { email: maskEmail(email), found: Boolean(user) });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reset password — consume the token, set the new password.
// ---------------------------------------------------------------------------
const resetSchema = z.object({
  token: z.string().min(1),
  uid: z.string().min(1),
  password: passwordRule,
});

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  // FormData keeps the new password + reset token out of Next's dev server-action logs.
  const parsed = resetSchema.safeParse({
    token: (formData.get('token') ?? '').toString(),
    uid: (formData.get('uid') ?? '').toString(),
    password: (formData.get('password') ?? '').toString(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Your new password is invalid.' };
  }
  const { token, uid, password } = parsed.data;

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(sql`${passwordResetTokens.userId} = ${uid} and ${passwordResetTokens.tokenHash} = ${hashToken(token)}`)
    .limit(1);

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    serverLog('auth', 'resetPassword', 'failure', { actor: uid, reason: 'invalid_or_expired_token' });
    return { ok: false, error: 'This reset link is invalid or has expired. Please request a new one.' };
  }

  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, uid));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  });
  serverLog('auth', 'resetPassword', 'success', { actor: uid });
  return { ok: true };
}
