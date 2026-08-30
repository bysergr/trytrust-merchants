import { NextRequest, NextResponse } from 'next/server';
import { createPackageRequest } from '@/lib/services/requests';
import { attachSessionCookie, getSessionIdFromRequest } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vehicle_type_id,
      pickup_address,
      dropoff_address,
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng,
      package_description,
      package_weight_kg,
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
    if (!package_description || !package_description.trim()) {
      return NextResponse.json({ error: 'package_description is required' }, { status: 400 });
    }
    if (typeof package_weight_kg !== 'number' || package_weight_kg <= 0) {
      return NextResponse.json(
        { error: 'package_weight_kg must be a positive number' },
        { status: 400 }
      );
    }

    const serviceRequest = createPackageRequest(
      {
        vehicle_type_id,
        pickup_address,
        dropoff_address,
        pickup_lat: typeof pickup_lat === 'number' ? pickup_lat : undefined,
        pickup_lng: typeof pickup_lng === 'number' ? pickup_lng : undefined,
        dropoff_lat: typeof dropoff_lat === 'number' ? dropoff_lat : undefined,
        dropoff_lng: typeof dropoff_lng === 'number' ? dropoff_lng : undefined,
        package_description,
        package_weight_kg,
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
    const message = error instanceof Error ? error.message : 'Failed to request package delivery';
    const isInventoryConflict = message.includes('No vehicles available') || message.includes('contention');
    return NextResponse.json({ error: message }, { status: isInventoryConflict ? 409 : 400 });
  }
}
