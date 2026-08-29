'use client';

import React, { useState } from 'react';
import { CartDetail } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartDetail | null;
  isLoading: boolean;
  onUpdateQuantity: (productId: string, newQuantity: number) => Promise<void>;
  onRemoveItem: (productId: string) => Promise<void>;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  isLoading,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}: CartDrawerProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const items = cart?.items || [];
  const total = cart?.total || 0;
  const itemCount = cart?.item_count || 0;
  const freeShippingThreshold = 15000;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - total);
  const progressPercent = Math.min(100, (total / freeShippingThreshold) * 100);

  const handleQuantityChange = async (productId: string, currentQty: number, change: number) => {
    const nextQty = currentQty + change;
    try {
      setUpdatingId(productId);
      if (nextQty <= 0) {
        await onRemoveItem(productId);
      } else {
        await onUpdateQuantity(productId, nextQty);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      setUpdatingId(productId);
      await onRemoveItem(productId);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-[#2D3277]" />
              <h2 className="text-base font-bold text-slate-900">
                Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          {items.length > 0 && (
            <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 text-xs">
              {amountToFreeShipping === 0 ? (
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <Zap className="size-4 fill-emerald-600 text-emerald-600" />
                  <span>Congratulations! You unlocked FREE 4-Hour Express Shipping!</span>
                </div>
              ) : (
                <div>
                  <p className="text-emerald-900 font-medium mb-1">
                    Add <span className="font-bold">${amountToFreeShipping.toLocaleString('en-US')} COP</span> more for <span className="font-bold">FREE Express Delivery</span>
                  </p>
                  <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && items.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <p>Loading cart items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Your cart is empty</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Discover snacks, beverages, and sweets ready for 4-hour express delivery.
                  </p>
                </div>
                <Button
                  onClick={onClose}
                  className="bg-[#2D3277] hover:bg-[#1f2354] text-white font-bold text-xs px-5"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const isUpdating = updatingId === item.product_id;
                return (
                  <div
                    key={item.product_id}
                    className={`flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white transition-opacity ${
                      isUpdating ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    {/* Item Thumbnail */}
                    <div className="size-16 rounded-lg bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center p-1 overflow-hidden">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 text-center">Item</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.properties} • ${item.unit_price.toLocaleString('en-US')} COP
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        {/* Quantity picker */}
                        <div className="flex items-center border border-slate-200 rounded-md bg-slate-50">
                          <button
                            onClick={() => handleQuantityChange(item.product_id, item.quantity, -1)}
                            disabled={isUpdating}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.product_id, item.quantity, 1)}
                            disabled={isUpdating || item.quantity >= item.available_stock}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-50"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right">
                          <span className="text-xs font-extrabold text-slate-900">
                            ${item.subtotal.toLocaleString('en-US')} COP
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      disabled={isUpdating}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Summary */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${total.toLocaleString('en-US')} COP</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Express Delivery (within 4h):</span>
                  <span className="font-bold text-emerald-600">
                    {amountToFreeShipping === 0 ? 'FREE' : '$2,500 COP'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">Total:</span>
                  <span className="font-black text-lg text-slate-900">
                    ${(total + (amountToFreeShipping === 0 ? 0 : 2500)).toLocaleString('en-US')} COP
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Anonymous session protected by server capability token</span>
              </div>

              <Button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full font-bold h-11 text-sm bg-[#3483FA] hover:bg-[#2968c8] text-white shadow-md flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
