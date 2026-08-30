import { NextRequest, NextResponse } from 'next/server';
import { getRequestById } from '@/lib/services/requests';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id') || undefined;

    const serviceRequest = getRequestById(id, sessionId);
    if (!serviceRequest) {
      return NextResponse.json({ error: `Request "${id}" not found` }, { status: 404 });
    }

    return NextResponse.json({ request: serviceRequest });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
