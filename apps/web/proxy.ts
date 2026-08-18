import { NextRequest, NextResponse } from 'next/server';
import { isForgotPasswordEnabled } from '@/lib/features';

const sessionCookie = 'notes_access_token';
const passwordResetRoutes = new Set(['/forgot-password', '/reset-password']);
const publicRoutes = new Set([
  '/login',
  '/sign-up',
  '/auth/callback',
  '/share',
  ...(isForgotPasswordEnabled ? passwordResetRoutes : []),
]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(sessionCookie)?.value);

  if (!isForgotPasswordEnabled && passwordResetRoutes.has(pathname)) {
    return NextResponse.redirect(
      new URL(hasSessionCookie ? '/' : '/login', request.url),
    );
  }

  const isShareRoute = pathname.startsWith('/share/');
  if (!hasSessionCookie && !publicRoutes.has(pathname) && !isShareRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
