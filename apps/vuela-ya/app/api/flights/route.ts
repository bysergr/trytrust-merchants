import { NextRequest, NextResponse } from 'next/server';
import { listAllFlights, searchFlights } from '@/lib/services/flights';
import { CabinClass } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departure_date = searchParams.get('departure_date');
    const passengersParam = searchParams.get('passengers');
    const cabinClassParam = searchParams.get('cabin_class');
    const limitParam = searchParams.get('limit');

    const cabin_class = (cabinClassParam?.toLowerCase() as CabinClass) || undefined;

    // If search parameters are provided, perform targeted route search
    if (origin && destination && departure_date) {
      const passengers = passengersParam ? parseInt(passengersParam, 10) : 1;
      const flights = searchFlights({
        origin,
        destination,
        departure_date,
        passengers: isNaN(passengers) ? 1 : passengers,
        cabin_class,
      });
      return NextResponse.json({ flights });
    }

    // Otherwise, return all scheduled upcoming domestic flights
    const limit = limitParam ? parseInt(limitParam, 10) : 60;
    const flights = listAllFlights({
      limit: isNaN(limit) ? 60 : limit,
      cabin_class,
    });

    return NextResponse.json({ flights });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error retrieving flights';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
