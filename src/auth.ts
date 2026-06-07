/**
 * Auth.js (NextAuth v5) configuration.
 * - Drizzle adapter persists users/accounts in Aurora (same DB as the care record, so the
 *   signed-in `user.id` flows straight into `app.current_user_id` for Row-Level Security).
 * - JWT session strategy (required by the Credentials provider; no DB lookup per request).
 * - Providers are env-gated: each appears only when its credentials are configured, so the
 *   app runs with just email/password and lights up Google / Apple when keys are added.
 */
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';
import { verifyPassword } from '@/lib/password';
import { recordLoginEvent, recordLogoutEvent } from '@/db/audit';
import { serverLog, maskEmail } from '@/lib/log';

/** Which OAuth providers are configured — also read by the UI to show/hide the buttons. */
export const authProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  apple: Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET),
};

const providers: NextAuthConfig['providers'] = [];

if (authProviders.google) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Always show the account chooser instead of silently reusing a session.
      authorization: { params: { prompt: 'select_account' } },
    }),
  );
}

if (authProviders.apple) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
  );
}

// Email + password. Sign-up is handled by a server action (see src/lib/auth/actions.ts)
// which creates the user + hash; here we only verify an existing credential.
providers.push(
  Credentials({
    name: 'Email and password',
    credentials: { email: {}, password: {} },
    authorize: async (creds) => {
      const email = String(creds?.email ?? '').trim().toLowerCase();
      const password = String(creds?.password ?? '');
      if (!email || !password) {
        serverLog('auth', 'authorize', 'failure', { email: maskEmail(email), reason: 'missing_fields' });
        return null;
      }

      try {
        const rows = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`);

        // Diagnostic only — no password/PII. Distinguishes the three silent null paths so a
        // "wrong email/password" failure is debuggable from the server console.
        if (rows.length === 0) {
          serverLog('auth', 'authorize', 'failure', { email: maskEmail(email), reason: 'user_not_found' });
          return null;
        }
        if (rows.length > 1) {
          // Should be impossible (unique index on lower(email)); flag if the constraint is missing.
          serverLog('auth', 'authorize', 'failure', { email: maskEmail(email), reason: 'duplicate_user_rows', count: rows.length });
        }
        const user = rows[0];

        // OAuth-only account with no password set.
        if (!user.passwordHash) {
          serverLog('auth', 'authorize', 'failure', { email: maskEmail(email), reason: 'no_password_hash' });
          return null;
        }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          serverLog('auth', 'authorize', 'failure', { email: maskEmail(email), reason: 'bad_password' });
          return null;
        }

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      } catch (err) {
        // Returning null (not throwing) keeps Auth.js from logging a CallbackRouteError whose
        // cause contains the SQL + the submitted email/password. Log only a safe error code so
        // infra issues are still diagnosable without exposing credentials or PII.
        const code = (err as { code?: string })?.code ?? (err as Error)?.name ?? 'unknown';
        console.error(`[auth] credentials authorize error (${code})`);
        return null;
      }
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  // Trust the deployment host (Vercel) when resolving callback URLs.
  trustHost: true,
  pages: { signIn: '/sign-in' },
  providers,
  // Sanitizing logger: never print error `cause` objects, which can carry SQL text, query
  // params, emails, or other PII. We log only the error name + short message.
  logger: {
    error(error) {
      console.error('[auth]', error?.name ?? 'Error', error?.message ? `- ${error.message}` : '');
    },
    warn(code) {
      console.warn('[auth]', code);
    },
    debug() {
      // no-op: debug output can include tokens/PII; keep it off.
    },
  },
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    // Append-only audit of every successful sign-in (credentials, Google, Apple).
    async signIn({ user, account }) {
      if (user?.id) {
        await recordLoginEvent(user.id, account?.provider);
      }
    },
    // Append-only audit of sign-out. JWT strategy → the user id is on the token's `sub`.
    async signOut(message) {
      const userId = 'token' in message ? message.token?.sub : message.session?.userId;
      if (userId) {
        await recordLogoutEvent(userId);
      }
    },
  },
});
