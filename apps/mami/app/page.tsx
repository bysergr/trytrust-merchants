'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { ProductWithStock, CartDetail, DeliveryAddress, OrderDetail } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { HeroBanner } from '@/components/HeroBanner';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { McpInfoModal } from '@/components/McpInfoModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, SlidersHorizontal, AlertCircle, RefreshCw, Zap } from 'lucide-react';

export default function StorePage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'name'>('default');
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Cart state
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderDetail | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState<boolean>(false);
  const [isMcpInfoOpen, setIsMcpInfoOpen] = useState<boolean>(false);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3000);
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products via Route Handler
  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setIsLoadingProducts(true);
        setError(null);

        const params = new URLSearchParams();
        if (debouncedSearch.trim()) {
          params.append('q', debouncedSearch.trim());
        }
        if (selectedCategory && selectedCategory !== 'all') {
          params.append('category', selectedCategory);
        }
        if (sortBy !== 'default') {
          params.append('sortBy', sortBy);
        }
        params.append('limit', '50');

        const response = await fetch(`/api/products?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Failed to load products (${response.status})`);
        }

        const data = await response.json();
        if (isMounted) {
          setProducts(data.products || []);
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories);
          }
        }
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Error fetching products';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, selectedCategory, sortBy, refreshKey]);

  // Fetch cart via Route Handler
  useEffect(() => {
    let isMounted = true;

    async function loadCart() {
      try {
        setIsLoadingCart(true);
        const response = await fetch('/api/cart', { cache: 'no-store' });
        if (response.ok && isMounted) {
          const data = await response.json();
          setCart(data);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) {
          setIsLoadingCart(false);
        }
      }
    }

    loadCart();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Add to cart handler
  const handleAddToCart = async (product: ProductWithStock, quantity: number) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          productId: product.id,
          quantity,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item to cart');
      }

      setCart(data.cart);
      showToast(`Added ${quantity} × ${product.name} to cart!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add item';
      showToast(`Error: ${msg}`);
      throw err;
    }
  };

  // Buy Now handler
  const handleBuyNow = async (product: ProductWithStock, quantity: number) => {
    await handleAddToCart(product, quantity);
    setIsCheckoutOpen(true);
  };

  // Update quantity in cart
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    // Determine existing item quantity
    const currentItem = cart?.items.find((i) => i.product_id === productId);
    const currentQty = currentItem ? currentItem.quantity : 0;
    const diff = newQuantity - currentQty;

    if (diff > 0) {
      // Add
      await handleAddToCart({ id: productId } as ProductWithStock, diff);
    } else if (diff < 0) {
      // Remove partial
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          productId,
          quantity: Math.abs(diff),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Failed to update quantity');
      } else {
        setCart(data.cart);
      }
    }
  };

  // Remove item entirely
  const handleRemoveItem = async (productId: string) => {
    const response = await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        productId,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || 'Failed to remove item');
    } else {
      setCart(data.cart);
      showToast('Item removed from cart');
    }
  };

  // Checkout submission
  const handleConfirmOrder = async (address: DeliveryAddress): Promise<OrderDetail> => {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        deliveryAddress: address,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Payment failed');
    }

    // Refresh products to show updated stock
    startTransition(() => {
      setRefreshKey((k) => k + 1);
      setCart({
        cart_id: '',
        session_id: '',
        status: 'open',
        items: [],
        item_count: 0,
        total: 0,
        currency: 'COP',
      });
    });

    return data.order;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EDEDED] text-slate-900 font-sans">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700">
            <Zap className="size-4 text-[#FFE600] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartItemCount={cart?.item_count || 0}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMcpInfo={() => setIsMcpInfoOpen(true)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Promotional Hero Banner */}
        <HeroBanner
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          totalProducts={products.length}
        />

        {/* Toolbar & Filter Count */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <SlidersHorizontal className="size-4 text-slate-500" />
            <span>
              Showing {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
            {selectedCategory !== 'all' && (
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                in <strong className="text-slate-900">{selectedCategory}</strong>
              </span>
            )}
            {debouncedSearch && (
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                matching &quot;{debouncedSearch}&quot;
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'default' | 'price_asc' | 'price_desc' | 'name')}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D3277]"
            >
              <option value="default">Relevance &amp; Code</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 mb-8">
            <AlertCircle className="size-8 text-red-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-red-900">Failed to load catalog</h3>
              <p className="text-xs text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="size-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Loading Skeletons Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white p-4 border border-slate-200 space-y-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Skeleton className="h-8 rounded" />
                  <Skeleton className="h-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty Search State */
          <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">No products match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching with different terms or reset your active category filter.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-5 py-2.5 rounded-lg bg-[#2D3277] text-white font-bold text-xs hover:bg-[#1f2354] transition-colors"
            >
              Clear Filters &amp; View All
            </button>
          </div>
        ) : (
          /* Products Grid: Mobile 1-col, Tablet 2-3 col, Desktop 4-5 col */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onOpenDetail={(prod) => {
                  setSelectedProduct(prod);
                  setIsDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">About Mami Market</h4>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Mercado Libre-style express grocery delivery. Order snacks, sweets, and cold drinks with 4-hour local fulfillment.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Express Shipping</h4>
              <ul className="space-y-1 text-[11px] text-slate-600">
                <li>• Estimated 4-hour arrival window</li>
                <li>• ⚡ FULL lightning fulfillment</li>
                <li>• Free delivery over $15,000 COP</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">Developers &amp; AI</h4>
              <ul className="space-y-1 text-[11px] text-slate-600">
                <li>• 6 Registered MCP Server Tools</li>
                <li>• Shared SQLite &amp; Route Handlers</li>
                <li>• Strict concurrency &amp; locking</li>
                <li>
                  •{' '}
                  <Link href="/admin" className="text-blue-600 font-bold hover:underline">
                    Admin Inventory Panel →
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">MCP Architecture</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Spec 2026-07-28 compliant: Application-level session capabilities and immediate transactional stock updates.
              </p>
              <button
                onClick={() => setIsMcpInfoOpen(true)}
                className="text-blue-600 font-bold hover:underline"
              >
                Inspect MCP Configuration →
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} Mami Market Express. All prices in Colombian Pesos (COP).</p>
            <p className="flex items-center gap-1 font-semibold text-slate-600">
              <span>English Language UI &amp; MCP Protocol</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProduct(null);
        }}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        isLoading={isLoadingCart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        onConfirmOrder={handleConfirmOrder}
        onOrderSuccess={(order) => {
          setConfirmedOrder(order);
          setIsSuccessOpen(true);
        }}
      />

      {/* Order Success Modal */}
      <OrderSuccessModal
        order={confirmedOrder}
        isOpen={isSuccessOpen}
        onClose={() => {
          setIsSuccessOpen(false);
          setConfirmedOrder(null);
        }}
      />

      {/* MCP Info Modal */}
      <McpInfoModal
        isOpen={isMcpInfoOpen}
        onClose={() => setIsMcpInfoOpen(false)}
      />
    </div>
  );
}
