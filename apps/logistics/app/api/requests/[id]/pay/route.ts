import { NextRequest, NextResponse } from 'next/server';
import { payRequest } from '@/lib/services/requests';
import { getSessionIdFromRequest } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let paymentConfirmation: string | Record<string, unknown> | undefined;
    let explicitSessionId: string | undefined;

    try {
      const body = await request.json();
      if (body?.session_id) {
        explicitSessionId = body.session_id;
      }
      if (body?.payment_confirmation) {
        paymentConfirmation = body.payment_confirmation;
      }
    } catch {
      // Body is optional
    }

    const { sessionId } = getSessionIdFromRequest(request, explicitSessionId);
    const updated = payRequest({
      session_id: sessionId,
      request_id: id,
      payment_confirmation: paymentConfirmation,
    });

    return NextResponse.json({
      success: true,
      message: `Payment confirmed for request "${id}".`,
      request: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    const isNotFound = message.includes('not found');
    return NextResponse.json({ error: message }, { status: isNotFound ? 404 : 400 });
  }
}
