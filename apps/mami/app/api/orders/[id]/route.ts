import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/services/checkout';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: `Order with ID '${id}' was not found.` }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
