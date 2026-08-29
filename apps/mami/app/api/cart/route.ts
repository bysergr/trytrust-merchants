import { NextRequest, NextResponse } from 'next/server';
import { addToCart, removeFromCart, getCartBySessionId } from '@/lib/services/cart';

const COOKIE_NAME = 'mami_session_id';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(COOKIE_NAME)?.value;

    if (!sessionId) {
      return NextResponse.json({
        cart_id: '',
        session_id: '',
        status: 'open',
        items: [],
        item_count: 0,
        total: 0,
        currency: 'COP',
      });
    }

    const cart = getCartBySessionId(sessionId);
    if (!cart) {
      // If the cart doesn't exist or is invalid, clear cookie
      const response = NextResponse.json({
        cart_id: '',
        session_id: '',
        status: 'open',
        items: [],
        item_count: 0,
        total: 0,
        currency: 'COP',
      });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch cart';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieSessionId = request.cookies.get(COOKIE_NAME)?.value;
    const sessionId = body.sessionId || cookieSessionId || undefined;
    const productId = body.productId;
    const quantity = parseInt(body.quantity || '1', 10);

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const result = addToCart({
      sessionId,
      productId: String(productId),
      quantity,
    });

    const response = NextResponse.json({
      cart: result.cartDetail,
      sessionId: result.sessionId,
    });

    // Set or refresh secure httpOnly cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: result.sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add item to cart';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = request.method === 'DELETE' && request.headers.get('content-type')?.includes('application/json')
      ? await request.json().catch(() => ({}))
      : {};

    const cookieSessionId = request.cookies.get(COOKIE_NAME)?.value;
    const sessionId = body.sessionId || searchParams.get('sessionId') || cookieSessionId;
    const productId = body.productId || searchParams.get('productId');
    const quantityParam = body.quantity ?? searchParams.get('quantity');
    const quantity = quantityParam ? parseInt(String(quantityParam), 10) : undefined;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const result = removeFromCart({
      sessionId,
      productId: String(productId),
      quantity,
    });

    return NextResponse.json({
      cart: result.cartDetail,
      sessionId: result.sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove item from cart';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
