import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct } from '@/lib/services/products';

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || !id.trim()) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    let price: number | undefined;
    if (body.price !== undefined && body.price !== null) {
      if (typeof body.price === 'number') {
        price = body.price;
      } else if (typeof body.price === 'string' && body.price.trim() !== '' && !isNaN(Number(body.price))) {
        price = Number(body.price);
      } else {
        return NextResponse.json({ error: 'Price must be a non-negative integer.' }, { status: 400 });
      }
    }

    let current_stock: number | undefined;
    const rawStock = body.current_stock !== undefined ? body.current_stock : body.stock;
    if (rawStock !== undefined && rawStock !== null) {
      if (typeof rawStock === 'number') {
        current_stock = rawStock;
      } else if (typeof rawStock === 'string' && rawStock.trim() !== '' && !isNaN(Number(rawStock))) {
        current_stock = Number(rawStock);
      } else {
        return NextResponse.json({ error: 'Current stock must be a non-negative integer.' }, { status: 400 });
      }
    }

    if (price === undefined && current_stock === undefined) {
      return NextResponse.json(
        { error: 'At least one field (price or current_stock/stock) must be provided.' },
        { status: 400 }
      );
    }

    const updatedProduct = updateProduct({
      id,
      price,
      current_stock,
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Product updated successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';

    if (message.includes('not found') || message.includes('was not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message.includes('must be') ||
      message.includes('required') ||
      message.includes('Invalid') ||
      message.includes('non-negative')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
