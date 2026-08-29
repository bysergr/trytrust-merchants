import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/services/products';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = getProductById(id);

    if (!product) {
      return NextResponse.json({ error: `Product with ID '${id}' was not found.` }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
