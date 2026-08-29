import { NextRequest, NextResponse } from 'next/server';
import { getFlightDetails } from '@/lib/services/flights';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const flight = getFlightDetails(id);
    return NextResponse.json({ flight });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error retrieving flight details';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
