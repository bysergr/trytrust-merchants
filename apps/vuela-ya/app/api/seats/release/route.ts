import { NextRequest, NextResponse } from 'next/server';
import { releaseSeat } from '@/lib/services/seats';
import { getSessionIdFromRequest } from '@/lib/session-cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seat_number, booking_session_id } = body;

    if (!seat_number) {
      return NextResponse.json({ error: 'seat_number is required.' }, { status: 400 });
    }

    const currentSessionId = getSessionIdFromRequest(request, booking_session_id);
    if (!currentSessionId) {
      return NextResponse.json({ error: 'No active booking session found.' }, { status: 400 });
    }

    const result = releaseSeat({
      booking_session_id: currentSessionId,
      seat_number,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error releasing seat';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
