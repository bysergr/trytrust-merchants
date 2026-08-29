'use client';

import React, { useState } from 'react';
import { ProductWithStock } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Zap, Eye, Check } from 'lucide-react';

interface ProductCardProps {
  product: ProductWithStock;
  onAddToCart: (product: ProductWithStock, quantity: number) => Promise<void>;
  onOpenDetail: (product: ProductWithStock) => void;
}

export function ProductCard({
  product,
  onAddToCart,
  onOpenDetail,
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isOutOfStock = product.current_stock <= 0;
  const isLowStock = product.current_stock > 0 && product.current_stock <= 10;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;

    try {
      setIsAdding(true);
      await onAddToCart(product, 1);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    } catch {
      // Error handled at parent level
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      onClick={() => onOpenDetail(product)}
      className="group relative flex flex-col justify-between rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 cursor-pointer overflow-hidden"
    >
      <div>
        {/* Image Container */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-50 flex items-center justify-center p-3 mb-3">
          {product.image_url && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 text-xs text-center p-2">
              <span className="font-semibold">{product.name}</span>
              <span className="text-[10px] text-slate-400 mt-1">Image Preview</span>
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <span className="bg-emerald-600 text-white font-black italic text-[9px] px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
              <Zap className="size-2.5 fill-white" />
              FULL
            </span>
          </div>

          <div className="absolute top-2 right-2">
            {isOutOfStock ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Out of Stock
              </Badge>
            ) : isLowStock ? (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-900 border-amber-300">
                Only {product.current_stock} left
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/90 text-slate-600 border-slate-200">
                {product.properties}
              </Badge>
            )}
          </div>
        </div>

        {/* Category & Details */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>{product.category}</span>
            <span className="text-slate-400 font-mono">SKU: {product.sku}</span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>

      {/* Price & Action Section */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900 leading-tight">
              ${product.price.toLocaleString('en-US')}{' '}
              <span className="text-xs font-semibold text-slate-500">COP</span>
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              ⚡ Free 4h delivery on $15k+
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(product);
            }}
            className="w-full text-xs h-8 font-semibold text-slate-700 hover:bg-slate-50 border-slate-200"
          >
            <Eye className="size-3.5 mr-1" />
            Details
          </Button>

          <Button
            variant={justAdded ? 'secondary' : 'default'}
            size="sm"
            disabled={isOutOfStock || isAdding}
            onClick={handleQuickAdd}
            className={`w-full text-xs h-8 font-bold ${
              justAdded
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#3483FA] hover:bg-[#2968c8] text-white'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="size-3.5 mr-1" />
                Added
              </>
            ) : isAdding ? (
              'Adding...'
            ) : isOutOfStock ? (
              'Sold Out'
            ) : (
              <>
                <ShoppingCart className="size-3.5 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
