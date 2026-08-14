import type { CookieOptions, Response } from 'express';

const sessionCookieName = 'notes_access_token';
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;

function usesSharedCookieDomain() {
  return (
    process.env.NODE_ENV === 'production' && Boolean(process.env.COOKIE_DOMAIN)
  );
}

function legacyCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function sessionCookieOptions(): CookieOptions {
  return {
    ...legacyCookieOptions(),
    ...(usesSharedCookieDomain() ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

export function setSessionCookie(response: Response, token: string) {
  if (usesSharedCookieDomain()) {
    response.clearCookie(sessionCookieName, legacyCookieOptions());
  }

  response.cookie(sessionCookieName, token, {
    ...sessionCookieOptions(),
    maxAge: sessionLifetime,
  });
}

export function migrateSessionCookie(
  response: Response,
  token: string | undefined,
) {
  if (!token || !usesSharedCookieDomain()) return;

  response.clearCookie(sessionCookieName, legacyCookieOptions());
  response.cookie(sessionCookieName, token, {
    ...sessionCookieOptions(),
    maxAge: sessionLifetime,
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(sessionCookieName, legacyCookieOptions());

  if (usesSharedCookieDomain()) {
    response.clearCookie(sessionCookieName, sessionCookieOptions());
  }
}
