import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/services/checkout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: `Order with ID '${id}' was not found.` }, { status: 404, headers: noCacheHeaders });
    }

    return NextResponse.json(order, { headers: noCacheHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    return NextResponse.json({ error: message }, { status: 500, headers: noCacheHeaders });
  }
}
