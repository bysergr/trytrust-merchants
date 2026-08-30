import { NextRequest, NextResponse } from 'next/server';
import { getFlightDetails, updateFlight } from '@/lib/services/flights';

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const flight = updateFlight(id, body);

    return NextResponse.json({
      success: true,
      flight,
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error updating flight';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}
