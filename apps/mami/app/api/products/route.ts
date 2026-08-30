import { NextRequest, NextResponse } from 'next/server';
import { listProducts, searchProducts, getCategories } from '@/lib/services/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

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

      return NextResponse.json(
        {
          products,
          total: products.length,
          page: 1,
          limit,
          totalPages: 1,
          categories,
        },
        { headers: noCacheHeaders }
      );
    }

    const result = listProducts({
      page,
      limit,
      category,
      sortBy,
    });

    return NextResponse.json(
      {
        ...result,
        categories,
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products';
    return NextResponse.json({ error: message }, { status: 500, headers: noCacheHeaders });
  }
}
