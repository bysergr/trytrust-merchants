import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const COOKIE_NAME = 'logistics_session_id';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function generateSessionId(): string {
  return `sess_${crypto.randomUUID()}`;
}

export function getSessionIdFromRequest(
  request: NextRequest,
  explicitSessionId?: string | null
): { sessionId: string; isNew: boolean } {
  if (explicitSessionId && explicitSessionId.trim()) {
    return { sessionId: explicitSessionId.trim(), isNew: false };
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value && cookie.value.trim()) {
    return { sessionId: cookie.value.trim(), isNew: false };
  }

  return { sessionId: generateSessionId(), isNew: true };
}

export function attachSessionCookie(response: NextResponse, sessionId: string): NextResponse {
  response.cookies.set({
    name: COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
