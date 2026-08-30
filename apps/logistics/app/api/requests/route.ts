import { NextRequest, NextResponse } from 'next/server';
import { listRequestsBySession } from '@/lib/services/requests';
import { getSessionIdFromRequest } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const explicitSessionId = searchParams.get('session_id');
    const { sessionId } = getSessionIdFromRequest(request, explicitSessionId);

    const requests = listRequestsBySession(sessionId);
    return NextResponse.json({
      requests,
      session_id: sessionId,
      count: requests.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve session requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
