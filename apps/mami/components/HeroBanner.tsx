'use client';

import React from 'react';
import { Zap, ShieldCheck, Clock, Truck, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HeroBannerProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  totalProducts: number;
}

export function HeroBanner({
  categories,
  selectedCategory,
  onSelectCategory,
  totalProducts,
}: HeroBannerProps) {
  return (
    <div className="w-full mb-6">
      {/* Mercado Libre Style Promo Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D3277] via-[#1E2250] to-[#0F112E] text-white p-6 md:p-8 shadow-md border border-slate-700/50">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFE600] text-slate-950 text-xs font-black px-2.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Zap className="size-3.5 fill-slate-950" />
                EXPRESS DISPATCH
              </span>
              <Badge variant="melifull" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                Guaranteed in &lt; 4 Hours
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Snacks, Drinks & Treats <br />
              <span className="text-[#FFE600]">Delivered Today at Your Door</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore authentic chips, creamy cookies, cold sodas, and sweet snacks. Real-time inventory tracking and immediate atomic checkout.
            </p>
          </div>

          {/* Value props cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 shrink-0 text-xs">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Clock className="size-4" />
              </div>
              <div>
                <p className="font-bold text-white">Instant ETA</p>
                <p className="text-white/70 text-[11px]">Arrival under 4h</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-amber-400/20 text-amber-300">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="font-bold text-white">100% Stock Safe</p>
                <p className="text-white/70 text-[11px]">Atomic locking</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-blue-400/20 text-blue-300">
                <Truck className="size-4" />
              </div>
              <div>
                <p className="font-bold text-white">Free Delivery</p>
                <p className="text-white/70 text-[11px]">On orders &gt; $15k</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-purple-400/20 text-purple-300">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="font-bold text-white">MCP Enabled</p>
                <p className="text-white/70 text-[11px]">AI Agent friendly</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            selectedCategory === 'all'
              ? 'bg-[#2D3277] text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Items ({totalProducts})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
              selectedCategory === cat
                ? 'bg-[#2D3277] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
