import { NextRequest, NextResponse } from 'next/server';

export const COOKIE_NAME = 'vuela_booking_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export function getSessionIdFromRequest(request: NextRequest, explicitSessionId?: string): string | undefined {
  if (explicitSessionId && explicitSessionId.trim()) {
    return explicitSessionId.trim();
  }
  const cookie = request.cookies.get(COOKIE_NAME);
  return cookie?.value?.trim() || undefined;
}

export function attachSessionCookie(response: NextResponse, sessionId: string): NextResponse {
  response.cookies.set({
    name: COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
