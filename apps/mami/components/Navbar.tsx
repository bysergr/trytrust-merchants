'use client';

import React from 'react';
import { Search, ShoppingCart, MapPin, Sparkles, X, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartItemCount: number;
  onOpenCart: () => void;
  onOpenMcpInfo: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function Navbar({
  searchQuery,
  onSearchChange,
  cartItemCount,
  onOpenCart,
  onOpenMcpInfo,
  selectedCategory,
  onSelectCategory,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFE600] border-b border-amber-300/80 shadow-sm">
      {/* Top Banner / MCP Info */}
      <div className="bg-[#2D3277] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">MCP Server & Next.js API Live</span>
            <span className="hidden sm:inline text-white/60">|</span>
            <span className="hidden sm:inline text-amber-200">Shared SQLite & Atomic Concurrency</span>
          </div>
          <button
            onClick={onOpenMcpInfo}
            className="flex items-center gap-1.5 hover:text-amber-300 font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded transition-colors"
          >
            <Terminal className="size-3" />
            <span>MCP Tools (6 Available)</span>
          </button>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 sm:gap-8">
          {/* Logo */}
          <div 
            onClick={() => {
              onSearchChange('');
              onSelectCategory('all');
            }}
            className="cursor-pointer flex items-center gap-2 group shrink-0"
          >
            <div className="bg-[#2D3277] text-[#FFE600] font-black text-xl px-2.5 py-1 rounded-lg tracking-tight group-hover:scale-105 transition-transform flex items-center gap-1">
              <span>mami</span>
              <Sparkles className="size-4 text-amber-300 fill-amber-300" />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-black text-slate-900 leading-tight uppercase tracking-wider">
                Mercado Express
              </span>
              <span className="text-[10px] text-slate-700 font-semibold leading-tight">
                Lightning Fast Delivery
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search snacks, cookies, sodas, drinks..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-white text-slate-900 border-none shadow-inner h-10 pr-10 pl-4 text-sm rounded-lg focus-visible:ring-2 focus-visible:ring-[#2D3277]"
              />
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : (
                <div className="absolute right-3 text-slate-400 pointer-events-none">
                  <Search className="size-4" />
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Delivery address snippet */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-800 font-medium bg-amber-300/60 px-3 py-1.5 rounded-lg">
              <MapPin className="size-3.5 text-slate-700" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-600 leading-none">Deliver to</span>
                <span className="font-semibold leading-tight">Express Area (4h)</span>
              </div>
            </div>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 bg-[#2D3277] hover:bg-[#1f2354] text-white px-3.5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow"
              aria-label="View Cart"
            >
              <ShoppingCart className="size-4" />
              <span className="hidden sm:inline font-semibold">Cart</span>
              {cartItemCount > 0 && (
                <span className="bg-emerald-500 text-white font-bold text-xs px-2 py-0.5 rounded-full leading-none animate-in zoom-in-75 duration-200">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Sub-bar / Quick info */}
        <div className="mt-2.5 pt-2 border-t border-amber-300/60 flex items-center justify-between text-xs text-slate-800 overflow-x-auto scrollbar-none gap-4">
          <div className="flex items-center gap-4 shrink-0 font-medium">
            <button
              onClick={() => onSelectCategory('all')}
              className={`hover:text-slate-950 transition-colors ${
                selectedCategory === 'all' ? 'font-bold text-slate-950 underline underline-offset-4' : 'text-slate-700'
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => onSelectCategory('Snacks & Chips')}
              className={`hover:text-slate-950 transition-colors ${
                selectedCategory === 'Snacks & Chips' ? 'font-bold text-slate-950 underline underline-offset-4' : 'text-slate-700'
              }`}
            >
              Snacks & Chips
            </button>
            <button
              onClick={() => onSelectCategory('Cookies & Biscuits')}
              className={`hover:text-slate-950 transition-colors ${
                selectedCategory === 'Cookies & Biscuits' ? 'font-bold text-slate-950 underline underline-offset-4' : 'text-slate-700'
              }`}
            >
              Cookies & Biscuits
            </button>
            <button
              onClick={() => onSelectCategory('Beverages & Sodas')}
              className={`hover:text-slate-950 transition-colors ${
                selectedCategory === 'Beverages & Sodas' ? 'font-bold text-slate-950 underline underline-offset-4' : 'text-slate-700'
              }`}
            >
              Beverages & Sodas
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-800 text-[11px] font-semibold">
            <Badge variant="melifull" className="py-0 px-2 text-[10px] bg-emerald-600 text-white font-black italic">
              ⚡ FULL
            </Badge>
            <span>Arrives today in under 4 hours</span>
          </div>
        </div>
      </div>
    </header>
  );
}
