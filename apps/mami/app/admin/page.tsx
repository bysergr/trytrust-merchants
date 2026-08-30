'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { ProductWithStock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Save,
  Check,
  Package,
  AlertTriangle,
  Boxes,
  SlidersHorizontal,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface RowDraft {
  price: number;
  stock: number;
}

export default function AdminPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const [, startTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 3000);
  };

  // Fetch products
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/products?limit=100');
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        if (isMounted) {
          const prods: ProductWithStock[] = data.products || [];
          setProducts(prods);

          // Initialize drafts
          const initialDrafts: Record<string, RowDraft> = {};
          for (const p of prods) {
            initialDrafts[p.id] = {
              price: p.price,
              stock: p.current_stock,
            };
          }
          setDrafts(initialDrafts);
        }
      } catch (err) {
        if (isMounted) {
          showToast(err instanceof Error ? err.message : 'Error loading catalog');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handlePriceChange = (productId: string, val: string) => {
    const num = val === '' ? 0 : parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      setDrafts((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || { price: 0, stock: 0 }),
          price: num,
        },
      }));
    }
  };

  const handleStockChange = (productId: string, val: string) => {
    const num = val === '' ? 0 : parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      setDrafts((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || { price: 0, stock: 0 }),
          stock: num,
        },
      }));
    }
  };

  const handleStockStep = (productId: string, delta: number) => {
    const current = drafts[productId]?.stock ?? 0;
    const next = Math.max(0, current + delta);
    setDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || { price: 0, stock: 0 }),
        stock: next,
      },
    }));
  };

  const handleResetRow = (product: ProductWithStock) => {
    setDrafts((prev) => ({
      ...prev,
      [product.id]: {
        price: product.price,
        stock: product.current_stock,
      },
    }));
  };

  const handleSaveRow = async (product: ProductWithStock) => {
    const draft = drafts[product.id];
    if (!draft) return;

    try {
      setSavingId(product.id);
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: draft.price,
          current_stock: draft.stock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      // Update local products state
      startTransition(() => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? { ...p, price: draft.price, current_stock: draft.stock }
              : p
          )
        );
      });

      setSavedId(product.id);
      setTimeout(() => setSavedId((c) => (c === product.id ? null : c)), 2000);
      showToast(`Updated "${product.name}" successfully!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      showToast(`Error: ${msg}`);
    } finally {
      setSavingId(null);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const totalUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
  const lowStockCount = products.filter(
    (p) => p.current_stock > 0 && p.current_stock <= 10
  ).length;
  const outOfStockCount = products.filter((p) => p.current_stock === 0).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700">
            <Sparkles className="size-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Admin Top Navigation */}
      <header className="bg-[#2D3277] text-white border-b border-slate-700 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Store</span>
            </Link>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>Inventory &amp; Pricing Admin</span>
              <Badge variant="melifull" className="bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0">
                UNPROTECTED
              </Badge>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshTrigger((k) => k + 1)}
              className="text-xs h-8 font-semibold bg-white/10 text-white hover:bg-white/20 border-white/20"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Catalog Items</span>
              <Package className="size-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{products.length}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Stock in Units</span>
              <Boxes className="size-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalUnits}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Low Stock (&le; 10)</span>
              <AlertTriangle className="size-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600">{lowStockCount}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Out of Stock</span>
              <AlertTriangle className="size-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-600">{outOfStockCount}</p>
          </div>
        </div>

        {/* Search and Filters Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="size-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by product name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 focus-visible:ring-[#2D3277]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <SlidersHorizontal className="size-3.5" />
              <span>Category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2D3277]"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4 hidden md:table-cell">Category</th>
                  <th className="py-3 px-4 w-44">Price (COP)</th>
                  <th className="py-3 px-4 w-48">Stock Quantity</th>
                  <th className="py-3 px-4 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-12 rounded-lg" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-8 w-28 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <Skeleton className="h-8 w-32 rounded" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Skeleton className="h-8 w-16 ml-auto rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Package className="size-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-sm text-slate-700">No products found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const draft = drafts[product.id] || {
                      price: product.price,
                      stock: product.current_stock,
                    };
                    const isDirty =
                      draft.price !== product.price ||
                      draft.stock !== product.current_stock;
                    const isSaving = savingId === product.id;
                    const isSaved = savedId === product.id;

                    const stock = draft.stock;
                    const isOutOfStock = stock <= 0;
                    const isLowStock = stock > 0 && stock <= 10;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isDirty ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        {/* Product info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-12 rounded-lg bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center p-1 overflow-hidden">
                              {product.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-400">Item</span>
                              )}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                  #{product.id}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  SKU: {product.sku}
                                </span>
                              </div>
                              <p className="font-bold text-slate-900 truncate">
                                {product.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {product.properties}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 hidden md:table-cell text-slate-600 font-medium">
                          <span className="bg-slate-100 px-2 py-1 rounded-md text-[11px]">
                            {product.category}
                          </span>
                        </td>

                        {/* Price input */}
                        <td className="py-3 px-4">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                              $
                            </span>
                            <Input
                              type="number"
                              min={0}
                              step={50}
                              value={draft.price === 0 ? '' : draft.price}
                              onChange={(e) =>
                                handlePriceChange(product.id, e.target.value)
                              }
                              className="pl-6 text-xs font-bold h-9 w-32 bg-white border-slate-200 focus-visible:ring-[#2D3277]"
                            />
                            <span className="ml-1.5 text-[10px] text-slate-400 font-semibold">
                              COP
                            </span>
                          </div>
                        </td>

                        {/* Stock input + controls */}
                        <td className="py-3 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStockStep(product.id, -1)}
                                disabled={draft.stock <= 0}
                                className="size-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                                aria-label="Decrease stock"
                              >
                                <Minus className="size-3" />
                              </button>
                              <Input
                                type="number"
                                min={0}
                                value={draft.stock}
                                onChange={(e) =>
                                  handleStockChange(product.id, e.target.value)
                                }
                                className="w-16 h-8 text-center text-xs font-bold bg-white border-slate-200 focus-visible:ring-[#2D3277]"
                              />
                              <button
                                type="button"
                                onClick={() => handleStockStep(product.id, 1)}
                                className="size-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600"
                                aria-label="Increase stock"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>

                            {/* Stock badge */}
                            <div>
                              {isOutOfStock ? (
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                                  Out of Stock
                                </Badge>
                              ) : isLowStock ? (
                                <Badge variant="warning" className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-900 border-amber-300">
                                  Low Stock: {stock} units
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-800">
                                  {stock} in Stock
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isDirty && (
                              <button
                                type="button"
                                onClick={() => handleResetRow(product)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Reset changes"
                                aria-label="Reset row"
                              >
                                <RotateCcw className="size-3.5" />
                              </button>
                            )}

                            <Button
                              size="sm"
                              disabled={isSaving || !isDirty}
                              onClick={() => handleSaveRow(product)}
                              className={`h-8 text-xs font-bold px-3 transition-all ${
                                isSaved
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : isDirty
                                  ? 'bg-[#2D3277] hover:bg-[#1f2354] text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <Check className="size-3.5 mr-1" />
                                  Saved
                                </>
                              ) : isSaving ? (
                                'Saving...'
                              ) : (
                                <>
                                  <Save className="size-3.5 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
