/**
 * Proxy (Next.js 16's renamed Middleware). Optimistic route protection only:
 * it redirects unauthenticated visitors away from app routes based on the session cookie.
 * The REAL enforcement is the Data Access Layer + Aurora Row-Level Security — never this file.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/timeline',
  '/medications',
  '/appointments',
  '/tasks',
  '/health',
  '/documents',
  '/people',
  '/digest',
  '/ask',
  '/settings',
  '/profile',
];

function hasSessionCookie(req: NextRequest): boolean {
  return Boolean(
    req.cookies.get('authjs.session-token') ?? req.cookies.get('__Secure-authjs.session-token'),
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !hasSessionCookie(req)) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except API, Next internals, and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
