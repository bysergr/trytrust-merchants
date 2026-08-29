import { NextRequest, NextResponse } from 'next/server';
import { compareFlights } from '@/lib/services/flights';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const flightIds = body.flight_ids;

    if (!flightIds || !Array.isArray(flightIds) || flightIds.length < 2) {
      return NextResponse.json(
        { error: 'flight_ids array with at least 2 flight IDs is required.' },
        { status: 400 }
      );
    }

    const flights = compareFlights(flightIds);
    return NextResponse.json({ flights });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error comparing flights';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
