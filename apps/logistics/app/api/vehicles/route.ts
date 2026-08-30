import { NextRequest, NextResponse } from 'next/server';
import { listVehicleTypes } from '@/lib/services/vehicles';
import { ServiceType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceParam = searchParams.get('service') as ServiceType | null;

    if (serviceParam && !['ride', 'package', 'freight'].includes(serviceParam)) {
      return NextResponse.json(
        { error: 'Invalid service parameter. Must be "ride", "package", or "freight".' },
        { status: 400 }
      );
    }

    const vehicles = listVehicleTypes(serviceParam || undefined);
    return NextResponse.json({
      vehicles,
      count: vehicles.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve vehicle types';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
