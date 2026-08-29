import { NextRequest, NextResponse } from 'next/server';
import { getSeatMap } from '@/lib/services/seats';
import { getSessionIdFromRequest } from '@/lib/session-cookie';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('flight_id');

    if (!flightId) {
      return NextResponse.json({ error: 'flight_id parameter is required.' }, { status: 400 });
    }

    const explicitSession = searchParams.get('booking_session_id') || undefined;
    const sessionId = getSessionIdFromRequest(request, explicitSession);

    const seatMap = getSeatMap(flightId, sessionId);
    return NextResponse.json({ seat_map: seatMap });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error retrieving seat map';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
