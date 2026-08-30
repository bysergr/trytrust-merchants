'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { User, Weight, Clock, CheckCircle2 } from 'lucide-react';
import { VehicleType } from '@/lib/types';

interface VehicleCardProps {
  vehicle: VehicleType & { count_available: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
  calculatedPrice?: number | null;
  etaMinutes?: number | null;
}

export function VehicleCard({
  vehicle,
  isSelected,
  onSelect,
  calculatedPrice,
  etaMinutes,
}: VehicleCardProps) {
  const [imageError, setImageError] = useState(false);
  const isAvailable = vehicle.count_available > 0;

  return (
    <div
      onClick={() => isAvailable && onSelect(vehicle.id)}
      className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-4 ${
        !isAvailable
          ? 'opacity-50 grayscale cursor-not-allowed bg-neutral-900/40 border-neutral-800'
          : isSelected
          ? 'bg-neutral-900 border-emerald-500 shadow-[0_0_15px_rgba(6,193,103,0.18)] ring-1 ring-emerald-500'
          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80'
      }`}
    >
      {/* Left side: Photo & details */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Vehicle Image */}
        <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-neutral-900 border border-neutral-800 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
          {!imageError && vehicle.icon_url ? (
            <Image
              src={vehicle.icon_url}
              alt={vehicle.name}
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className="object-contain p-1 rounded-lg transition-transform hover:scale-105"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-400 text-xs font-bold text-center p-1">
              {vehicle.name.slice(0, 10)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-bold text-sm sm:text-base tracking-tight truncate">
              {vehicle.name}
            </h4>
            {isSelected && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
          </div>

          <p className="text-neutral-400 text-xs line-clamp-1 mt-0.5">
            {vehicle.description}
          </p>

          {/* Badges: Capacity & ETA */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-neutral-300 font-medium">
            {vehicle.passenger_capacity && vehicle.passenger_capacity > 0 ? (
              <span className="flex items-center gap-1 bg-neutral-800 px-2 py-0.5 rounded-md text-neutral-300">
                <User className="w-3 h-3 text-neutral-400" />
                {vehicle.passenger_capacity} riders
              </span>
            ) : null}

            {vehicle.capacity_kg ? (
              <span className="flex items-center gap-1 bg-neutral-800 px-2 py-0.5 rounded-md text-neutral-300">
                <Weight className="w-3 h-3 text-neutral-400" />
                up to {vehicle.capacity_kg} kg
              </span>
            ) : null}

            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-emerald-400" />
              {etaMinutes || vehicle.eta_minutes_base || 5} min away
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Price & stock */}
      <div className="text-right flex-shrink-0">
        <div className="text-white font-black text-base sm:text-lg tracking-tight">
          {calculatedPrice !== undefined && calculatedPrice !== null ? (
            `$${calculatedPrice.toFixed(2)}`
          ) : (
            `$${vehicle.base_fare.toFixed(2)}+`
          )}
        </div>
        <div className="text-[11px] text-neutral-400 font-medium">
          {calculatedPrice ? 'total upfront' : `$${vehicle.per_km_rate.toFixed(2)}/km`}
        </div>

        {/* Fleet Availability count */}
        <div className="mt-1">
          {isAvailable ? (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold bg-neutral-800 text-neutral-300">
              {vehicle.count_available} available
            </span>
          ) : (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold bg-red-950/80 text-red-400 border border-red-800/60">
              Out of stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
