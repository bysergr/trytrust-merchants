import { NextRequest, NextResponse } from 'next/server';
import { calculateQuote } from '@/lib/services/geo-pricing';
import { QuoteInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      service,
      vehicle_type_id,
      pickup_address,
      dropoff_address,
      pickup_lat,
      pickup_lng,
      dropoff_lat,
      dropoff_lng,
      scheduled_at,
      package_weight_kg,
      cargo_weight_kg,
    } = body;

    if (!service || !['ride', 'package', 'freight'].includes(service)) {
      return NextResponse.json(
        { error: 'Service is required and must be "ride", "package", or "freight".' },
        { status: 400 }
      );
    }

    if (!vehicle_type_id || typeof vehicle_type_id !== 'string') {
      return NextResponse.json({ error: 'vehicle_type_id is required.' }, { status: 400 });
    }

    if (!pickup_address || typeof pickup_address !== 'string' || !pickup_address.trim()) {
      return NextResponse.json({ error: 'pickup_address is required.' }, { status: 400 });
    }

    if (!dropoff_address || typeof dropoff_address !== 'string' || !dropoff_address.trim()) {
      return NextResponse.json({ error: 'dropoff_address is required.' }, { status: 400 });
    }

    const quoteInput: QuoteInput = {
      service,
      vehicle_type_id: vehicle_type_id.trim(),
      pickup_address: pickup_address.trim(),
      dropoff_address: dropoff_address.trim(),
      pickup_lat: typeof pickup_lat === 'number' ? pickup_lat : null,
      pickup_lng: typeof pickup_lng === 'number' ? pickup_lng : null,
      dropoff_lat: typeof dropoff_lat === 'number' ? dropoff_lat : null,
      dropoff_lng: typeof dropoff_lng === 'number' ? dropoff_lng : null,
      scheduled_at: scheduled_at || null,
      package_weight_kg: typeof package_weight_kg === 'number' ? package_weight_kg : null,
      cargo_weight_kg: typeof cargo_weight_kg === 'number' ? cargo_weight_kg : null,
    };

    const quote = calculateQuote(quoteInput);
    return NextResponse.json({ quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate quote';
    const status = message.includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
