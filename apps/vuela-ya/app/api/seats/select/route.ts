import { NextRequest, NextResponse } from 'next/server';
import { selectSeat } from '@/lib/services/seats';
import { attachSessionCookie, getSessionIdFromRequest } from '@/lib/session-cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flight_id, seat_number, passenger_name, booking_session_id } = body;

    if (!flight_id || !seat_number) {
      return NextResponse.json(
        { error: 'flight_id and seat_number are required.' },
        { status: 400 }
      );
    }

    const currentSessionId = getSessionIdFromRequest(request, booking_session_id);

    const result = selectSeat({
      booking_session_id: currentSessionId,
      flight_id,
      seat_number,
      passenger_name,
    });

    const response = NextResponse.json(result);
    // Attach httpOnly session cookie for web client
    return attachSessionCookie(response, result.booking_session_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error selecting seat';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
