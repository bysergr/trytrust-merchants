import { NextRequest, NextResponse } from 'next/server';
import { cancelRequest } from '@/lib/services/requests';
import { getSessionIdFromRequest } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let explicitSessionId: string | undefined;

    try {
      const body = await request.json();
      if (body?.session_id) {
        explicitSessionId = body.session_id;
      }
    } catch {
      // Body is optional
    }

    const { sessionId } = getSessionIdFromRequest(request, explicitSessionId);
    const updated = cancelRequest(id, sessionId);

    return NextResponse.json({
      success: true,
      message: `Request "${id}" cancelled successfully. Vehicle returned to pool.`,
      request: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel request';
    const isNotFound = message.includes('not found');
    return NextResponse.json({ error: message }, { status: isNotFound ? 404 : 400 });
  }
}
