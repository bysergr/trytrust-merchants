import { NextRequest, NextResponse } from 'next/server';
import { adminUpdateRequest } from '@/lib/services/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { price, scheduled_at, status } = body;

    const parsedPrice =
      price !== undefined && price !== null && price !== ''
        ? typeof price === 'number'
          ? price
          : parseFloat(price)
        : undefined;

    const updated = adminUpdateRequest(id, {
      price: parsedPrice,
      scheduled_at: scheduled_at !== undefined ? scheduled_at : undefined,
      status: status !== undefined ? status : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Request "${id}" updated successfully.`,
      request: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update request';
    const isNotFound = message.includes('not found');
    return NextResponse.json({ error: message }, { status: isNotFound ? 404 : 400 });
  }
}
