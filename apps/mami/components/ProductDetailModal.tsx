'use client';

import React, { useState } from 'react';
import { ProductWithStock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ShoppingCart, Zap, Clock, ShieldCheck, Plus, Minus, Check } from 'lucide-react';

interface ProductDetailModalProps {
  product: ProductWithStock | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: ProductWithStock, quantity: number) => Promise<void>;
  onBuyNow: (product: ProductWithStock, quantity: number) => Promise<void>;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen || !product) return null;

  const isOutOfStock = product.current_stock <= 0;
  const isLowStock = product.current_stock > 0 && product.current_stock <= 10;
  const maxAvailable = Math.max(0, product.current_stock);

  const handleIncrement = () => {
    if (quantity < maxAvailable) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAdd = async () => {
    if (isOutOfStock || isAdding) return;
    try {
      setIsAdding(true);
      await onAddToCart(product, quantity);
      setJustAdded(true);
      setTimeout(() => {
        setJustAdded(false);
        onClose();
      }, 900);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuy = async () => {
    if (isOutOfStock || isBuying) return;
    try {
      setIsBuying(true);
      await onBuyNow(product, quantity);
      onClose();
    } finally {
      setIsBuying(false);
    }
  };

  const subtotal = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          aria-label="Close detail modal"
        >
          <X className="size-5" />
        </button>

        <div className="overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Image Preview */}
            <div className="relative aspect-square w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-6">
              {product.image_url && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  onError={() => setImageError(true)}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <p className="font-bold">{product.name}</p>
                  <p className="text-xs">No image available</p>
                </div>
              )}

              <div className="absolute top-3 left-3">
                <span className="bg-emerald-600 text-white font-black italic text-xs px-2 py-0.5 rounded shadow flex items-center gap-1">
                  <Zap className="size-3 fill-white" />
                  FULL
                </span>
              </div>
            </div>

            {/* Details Section */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                  <span>{product.category}</span>
                  <span>•</span>
                  <span>SKU: {product.sku}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {product.name}
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold text-slate-700 bg-slate-50">
                    Net Weight: {product.properties}
                  </Badge>
                  {isOutOfStock ? (
                    <Badge variant="destructive">Out of Stock</Badge>
                  ) : isLowStock ? (
                    <Badge variant="warning" className="bg-amber-100 text-amber-900 border-amber-300">
                      Low Stock: {product.current_stock} left
                    </Badge>
                  ) : (
                    <Badge variant="success">In Stock ({product.current_stock} available)</Badge>
                  )}
                </div>

                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Price & Guarantee */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Price</span>
                  <span className="text-2xl font-black text-slate-900">
                    ${product.price.toLocaleString('en-US')}{' '}
                    <span className="text-xs font-bold text-slate-500">COP</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-200/60 pt-2.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <Clock className="size-3.5" />
                    <span>Estimated arrival: Random moment within 4 hours today</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <ShieldCheck className="size-3.5" />
                    <span>Atomic inventory lock on checkout (no overselling)</span>
                  </div>
                </div>
              </div>

              {/* Quantity Picker & Subtotal */}
              {!isOutOfStock && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Quantity:</span>
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                      <button
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-slate-900">
                        {quantity}
                      </span>
                      <button
                        onClick={handleIncrement}
                        disabled={quantity >= maxAvailable}
                        className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Increase quantity"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                    <span>Subtotal:</span>
                    <span className="text-base font-black text-slate-900">
                      ${subtotal.toLocaleString('en-US')} COP
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={isOutOfStock || isAdding}
                  onClick={handleAdd}
                  className="font-bold text-sm h-11 border-slate-300 text-slate-800 hover:bg-slate-100"
                >
                  {justAdded ? (
                    <>
                      <Check className="size-4 mr-1.5 text-emerald-600" />
                      Added!
                    </>
                  ) : isAdding ? (
                    'Adding...'
                  ) : (
                    <>
                      <ShoppingCart className="size-4 mr-1.5" />
                      Add to Cart
                    </>
                  )}
                </Button>

                <Button
                  variant="default"
                  size="lg"
                  disabled={isOutOfStock || isBuying}
                  onClick={handleBuy}
                  className="font-bold text-sm h-11 bg-[#3483FA] hover:bg-[#2968c8] text-white"
                >
                  {isBuying ? (
                    'Processing...'
                  ) : (
                    <>
                      <Zap className="size-4 mr-1.5" />
                      Buy Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
