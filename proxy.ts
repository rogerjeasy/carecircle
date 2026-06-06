/**
 * Proxy (Next.js 16's renamed Middleware). Optimistic, FAIL-CLOSED route protection.
 *
 * Security model: every route is protected by DEFAULT. A path is reachable while logged out
 * only if it is explicitly listed below. This means a newly added route is automatically gated
 * until you deliberately make it public — you can never forget to protect a page.
 *
 * This layer is only the fast edge redirect (it checks for the session cookie's presence, not
 * its validity). The REAL enforcement is the server-side gate in src/app/(app)/layout.tsx
 * (`requireSession()`) plus Aurora Row-Level Security. Never rely on this file alone.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Exact public paths (reachable without a session).
const PUBLIC_ROUTES = new Set([
  '/', // marketing home
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/how-it-works',
  '/style-guide',
]);

// Public path prefixes (e.g. dynamic invitation links accepted while logged out).
const PUBLIC_PREFIXES = ['/invite'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(
    req.cookies.get('authjs.session-token') ?? req.cookies.get('__Secure-authjs.session-token'),
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = hasSessionCookie(req);

  // Signed-in users shouldn't land on the auth screens — send them into the app.
  if (authed && (pathname === '/sign-in' || pathname === '/sign-up')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Fail-closed: anything not explicitly public requires a session.
  if (!isPublic(pathname) && !authed) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
