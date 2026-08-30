import { NextRequest, NextResponse } from 'next/server';
import { createFreightRequest } from '@/lib/services/requests';
import { attachSessionCookie, getSessionIdFromRequest } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vehicle_type_id,
      pickup_address,
      dropoff_address,
      cargo_description,
      cargo_weight_kg,
      scheduled_at,
      session_id,
    } = body;

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
    if (!cargo_description || !cargo_description.trim()) {
      return NextResponse.json({ error: 'cargo_description is required' }, { status: 400 });
    }
    if (typeof cargo_weight_kg !== 'number' || cargo_weight_kg <= 0) {
      return NextResponse.json(
        { error: 'cargo_weight_kg must be a positive number' },
        { status: 400 }
      );
    }

    const serviceRequest = createFreightRequest(
      {
        vehicle_type_id,
        pickup_address,
        dropoff_address,
        cargo_description,
        cargo_weight_kg,
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
    const message = error instanceof Error ? error.message : 'Failed to request freight';
    const isInventoryConflict = message.includes('No vehicles available') || message.includes('contention');
    return NextResponse.json({ error: message }, { status: isInventoryConflict ? 409 : 400 });
  }
}
