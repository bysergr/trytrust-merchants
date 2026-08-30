import { NextRequest, NextResponse } from 'next/server';
import { attachSessionCookie, getSessionIdFromRequest } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { sessionId, isNew } = getSessionIdFromRequest(request);
  const response = NextResponse.json({
    sessionId,
    isNew,
  });

  if (isNew) {
    attachSessionCookie(response, sessionId);
  }

  return response;
}
