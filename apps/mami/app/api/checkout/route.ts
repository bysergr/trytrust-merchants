import { NextRequest, NextResponse } from 'next/server';
import { executeCheckout } from '@/lib/services/checkout';

const COOKIE_NAME = 'mami_session_id';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieSessionId = request.cookies.get(COOKIE_NAME)?.value;
    const sessionId = body.sessionId || cookieSessionId;
    const deliveryAddress = body.deliveryAddress;

    if (!sessionId) {
      return NextResponse.json({ error: 'No active cart session found for checkout.' }, { status: 400 });
    }

    if (!deliveryAddress) {
      return NextResponse.json({ error: 'Delivery address is required for checkout.' }, { status: 400 });
    }

    const orderDetail = executeCheckout({
      sessionId,
      deliveryAddress,
    });

    const response = NextResponse.json({
      order: orderDetail,
      message: 'Order placed successfully!',
    });

    // Clear session cookie since cart is now checked out
    response.cookies.delete(COOKIE_NAME);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
