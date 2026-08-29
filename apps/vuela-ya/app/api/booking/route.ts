import { NextRequest, NextResponse } from 'next/server';
import { getBookingBySession } from '@/lib/services/checkout';
import { getSessionIdFromRequest } from '@/lib/session-cookie';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const explicitSession = searchParams.get('session_id') || undefined;
    const sessionId = getSessionIdFromRequest(request, explicitSession);

    if (!sessionId) {
      return NextResponse.json({ booking: null });
    }

    const booking = getBookingBySession(sessionId);
    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error retrieving booking';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
