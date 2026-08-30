import { NextResponse } from 'next/server';
import { listAllRequests } from '@/lib/services/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requests = listAllRequests();
    return NextResponse.json({
      requests,
      count: requests.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve admin requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
