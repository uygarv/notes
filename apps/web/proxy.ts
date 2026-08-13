import { NextRequest, NextResponse } from 'next/server';

const sessionCookie = 'notes_access_token';
const publicRoutes = new Set(['/login', '/sign-up', '/forgot-password', '/reset-password']);
const signedInRedirectRoutes = new Set(['/login', '/sign-up']);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(sessionCookie)?.value);

  if (hasSessionCookie && (signedInRedirectRoutes.has(pathname) || pathname === '/auth/callback')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!hasSessionCookie && !publicRoutes.has(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
