'use client';

import React from 'react';
import Link from 'next/link';
import { Car, Package, Truck, ShieldAlert, History } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ServiceType } from '@/lib/types';

interface NavbarProps {
  activeTab: ServiceType | 'home' | 'tracking' | 'activity';
  onSelectTab: (tab: ServiceType | 'home' | 'tracking' | 'activity') => void;
  activeRequestId?: string | null;
  sessionId?: string | null;
  requestCount?: number;
}

export function Navbar({
  activeTab,
  onSelectTab,
  activeRequestId,
  sessionId,
  requestCount = 0,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-black text-white border-b border-neutral-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Custom Non-Letter / Non-Generic Logo */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center text-left group focus:outline-none hover:opacity-90 transition-opacity"
          >
            <BrandLogo />
          </button>

          {/* Primary Navigation Tabs - Authentic Uber Style */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onSelectTab('ride')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'ride'
                  ? 'bg-neutral-900 text-white shadow-inner ring-1 ring-neutral-700'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Car className="w-4 h-4 text-emerald-400" />
              Ride
            </button>
            <button
              onClick={() => onSelectTab('package')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'package'
                  ? 'bg-neutral-900 text-white shadow-inner ring-1 ring-neutral-700'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Package className="w-4 h-4 text-emerald-400" />
              Package (Flash)
            </button>
            <button
              onClick={() => onSelectTab('freight')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'freight'
                  ? 'bg-neutral-900 text-white shadow-inner ring-1 ring-neutral-700'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              Freight (Carga)
            </button>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {sessionId && (
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {sessionId.slice(0, 10)}...
            </span>
          )}

          {activeRequestId && (
            <button
              onClick={() => onSelectTab('tracking')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all border ${
                activeTab === 'tracking'
                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(6,193,103,0.3)]'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Trip
            </button>
          )}

          <button
            onClick={() => onSelectTab('activity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
              activeTab === 'activity'
                ? 'bg-neutral-800 text-white border-neutral-700'
                : 'text-neutral-400 border-neutral-800 hover:bg-neutral-900 hover:text-neutral-200'
            }`}
            title="Session Activity History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Activity</span>
            {requestCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-neutral-700 text-white rounded-full text-[10px]">
                {requestCount}
              </span>
            )}
          </button>

          {/* Unauthenticated Admin link */}
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 transition-colors"
            title="Unauthenticated Admin Portal"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin Table</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
