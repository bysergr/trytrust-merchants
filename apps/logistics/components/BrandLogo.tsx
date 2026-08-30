'use client';

import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function BrandLogo({ className = '', size = 'md', showSubtitle = true }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Custom Geometric Mobility Nexus Logomark (Neither a letter nor a generic icon) */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center bg-black rounded-xl p-1 border border-neutral-800 shadow-md"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="emeraldFacet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06c167" />
              <stop offset="100%" stopColor="#004d2c" />
            </linearGradient>
            <linearGradient id="whiteFacet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="accentFacet" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {/* Facet 1: Top Mobility Vector (Passenger Route) */}
          <polygon
            points="50,10 88,32 50,54 12,32"
            fill="url(#whiteFacet)"
            opacity="0.95"
          />

          {/* Facet 2: Bottom Right Vector (Express Courier Path) */}
          <polygon
            points="50,54 88,32 88,76 50,98"
            fill="url(#emeraldFacet)"
          />

          {/* Facet 3: Bottom Left Vector (Heavy Cargo Logistics Hub) */}
          <polygon
            points="50,54 12,32 12,76 50,98"
            fill="url(#accentFacet)"
            opacity="0.9"
          />

          {/* Central Nexus Core Node */}
          <circle cx="50" cy="54" r="8" fill="#000000" stroke="#06c167" strokeWidth="3" />
          <circle cx="50" cy="54" r="3.5" fill="#ffffff" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-lg sm:text-xl tracking-tight text-white font-sans uppercase">
            LOGISTICS
          </span>
          <span className="text-[10px] font-black tracking-widest text-emerald-400 bg-emerald-950/90 border border-emerald-800/80 px-1.5 py-0.5 rounded uppercase">
            BOGOTÁ
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-medium tracking-tight text-neutral-400 -mt-0.5">
            Integrated Mobility & Cargo Hub
          </span>
        )}
      </div>
    </div>
  );
}
