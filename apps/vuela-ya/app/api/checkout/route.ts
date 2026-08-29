import { NextRequest, NextResponse } from 'next/server';
import { executePayment } from '@/lib/services/checkout';
import { clearSessionCookie, getSessionIdFromRequest } from '@/lib/session-cookie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { passenger_name, passenger_document_id, contact_email, booking_session_id, payment_confirmation } = body;

    const sessionId = getSessionIdFromRequest(request, booking_session_id);
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No active booking session found. Please select seats before proceeding to payment.' },
        { status: 400 }
      );
    }

    const result = executePayment({
      booking_session_id: sessionId,
      passenger_name,
      passenger_document_id,
      contact_email,
      payment_confirmation,
    });

    const response = NextResponse.json(result);
    // Clear the active draft session cookie once confirmed
    return clearSessionCookie(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout and payment failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
