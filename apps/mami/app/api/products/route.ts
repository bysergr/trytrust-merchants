import { NextRequest, NextResponse } from 'next/server';
import { listProducts, searchProducts, getCategories } from '@/lib/services/products';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('search') || '';
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') as 'name' | 'price_asc' | 'price_desc' | 'popular' | undefined;

    const categories = getCategories();

    if (query.trim()) {
      const products = searchProducts({
        query,
        category,
        limit,
      });

      return NextResponse.json({
        products,
        total: products.length,
        page: 1,
        limit,
        totalPages: 1,
        categories,
      });
    }

    const result = listProducts({
      page,
      limit,
      category,
      sortBy,
    });

    return NextResponse.json({
      ...result,
      categories,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
