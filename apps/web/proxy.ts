import { NextRequest, NextResponse } from 'next/server';
import { isForgotPasswordEnabled } from '@/lib/features';

const sessionCookie = 'notes_access_token';
const passwordResetRoutes = new Set(['/forgot-password', '/reset-password']);
const publicRoutes = new Set([
  '/login',
  '/sign-up',
  ...(isForgotPasswordEnabled ? passwordResetRoutes : []),
]);
const signedInRedirectRoutes = new Set(['/login', '/sign-up']);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(sessionCookie)?.value);

  if (!isForgotPasswordEnabled && passwordResetRoutes.has(pathname)) {
    return NextResponse.redirect(
      new URL(hasSessionCookie ? '/' : '/login', request.url),
    );
  }

  if (
    hasSessionCookie &&
    (signedInRedirectRoutes.has(pathname) || pathname === '/auth/callback')
  ) {
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
