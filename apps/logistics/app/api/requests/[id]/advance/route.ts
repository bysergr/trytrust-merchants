import { NextRequest, NextResponse } from 'next/server';
import { advanceRequestStatus } from '@/lib/services/requests';
import { RequestStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['matched', 'en_route', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status must be provided: "matched", "en_route", or "completed".' },
        { status: 400 }
      );
    }

    const updated = advanceRequestStatus(id, status as RequestStatus);
    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to advance status';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
