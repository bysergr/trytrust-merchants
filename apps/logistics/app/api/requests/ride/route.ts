import { NextRequest, NextResponse } from 'next/server';
import { createRideRequest } from '@/lib/services/requests';
import { attachSessionCookie, getSessionIdFromRequest } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicle_type_id, pickup_address, dropoff_address, scheduled_at, session_id } = body;

    const { sessionId, isNew } = getSessionIdFromRequest(request, session_id);

    if (!vehicle_type_id) {
      return NextResponse.json({ error: 'vehicle_type_id is required' }, { status: 400 });
    }
    if (!pickup_address || !pickup_address.trim()) {
      return NextResponse.json({ error: 'pickup_address is required' }, { status: 400 });
    }
    if (!dropoff_address || !dropoff_address.trim()) {
      return NextResponse.json({ error: 'dropoff_address is required' }, { status: 400 });
    }

    const serviceRequest = createRideRequest(
      {
        vehicle_type_id,
        pickup_address,
        dropoff_address,
        scheduled_at,
      },
      sessionId
    );

    const response = NextResponse.json({
      success: true,
      request: serviceRequest,
      session_id: sessionId,
    });

    if (isNew) {
      attachSessionCookie(response, sessionId);
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to request ride';
    const isInventoryConflict = message.includes('No vehicles available') || message.includes('contention');
    return NextResponse.json({ error: message }, { status: isInventoryConflict ? 409 : 400 });
  }
}
