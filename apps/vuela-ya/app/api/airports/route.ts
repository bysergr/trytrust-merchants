import { NextRequest, NextResponse } from 'next/server';
import { listAirports } from '@/lib/services/airports';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || undefined;
    const airports = listAirports(query);
    return NextResponse.json({ airports });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error retrieving airports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
