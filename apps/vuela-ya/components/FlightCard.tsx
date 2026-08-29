'use client';

import React from 'react';
import { FlightSearchResult } from '@/lib/types';
import { getCityImageUrl } from '@/lib/city-images';
import {
  Clock,
  CheckSquare,
  Square,
  Info,
  ChevronRight,
  Plane,
  Luggage,
  Wifi,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface FlightCardProps {
  flight: FlightSearchResult;
  isCompared: boolean;
  onToggleCompare: (flightId: string) => void;
  onSelectFlight: (flight: FlightSearchResult) => void;
  onViewDetails: (flightId: string) => void;
}

export function FlightCard({
  flight,
  isCompared,
  onToggleCompare,
  onSelectFlight,
  onViewDetails,
}: FlightCardProps) {
  const depTime = new Date(flight.departure_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const arrTime = new Date(flight.arrival_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const depDate = new Date(flight.departure_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const hours = Math.floor(flight.duration_minutes / 60);
  const minutes = flight.duration_minutes % 60;
  const durationFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;

  const isLowSeats = flight.seats_remaining <= 5;
  const destinationImageUrl = getCityImageUrl(flight.destination);

  return (
    <Card className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:border-red-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/95 dark:hover:border-red-900/60">
      {/* Top Boarding Pass Avianca Red Brand Bar */}
      <div className="flex h-2 w-full items-center justify-between bg-gradient-to-r from-[#E01E26] via-[#E01E26] to-[#B0141B]">
        <div className="h-full w-12 bg-white/20" />
        <div className="h-full w-24 bg-white/10" />
      </div>

      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Main Boarding Pass Ticket Section */}
          <div className="flex-1 p-5 sm:p-6 lg:pr-7">
            {/* Header: Flight info & Compare Button */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50/90 px-2.5 py-0.5 font-mono text-xs font-black tracking-wider text-[#E01E26] dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-300">
                  {flight.flight_number}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {flight.aircraft_type}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {depDate}
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50/80 text-[10px] font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  Direct Non-Stop
                </Badge>
              </div>

              {/* Compare Toggle */}
              <button
                type="button"
                onClick={() => onToggleCompare(flight.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  isCompared
                    ? 'bg-red-100 text-[#C0181E] ring-1 ring-red-400 dark:bg-red-950 dark:text-red-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {isCompared ? (
                  <CheckSquare className="size-3.5 text-[#E01E26]" />
                ) : (
                  <Square className="size-3.5 text-slate-400" />
                )}
                <span>Compare</span>
              </button>
            </div>

            {/* Middle: Flight Route & Destination Thumbnail Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 py-5">
              {/* Route timings & path */}
              <div className="flex-1 grid grid-cols-3 items-center gap-2 sm:gap-4">
                {/* Origin */}
                <div className="text-left">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {depTime}
                  </span>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {flight.origin}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                    {flight.origin_city}
                  </div>
                </div>

                {/* Direct flight path line */}
                <div className="flex flex-col items-center justify-center px-1">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <Clock className="size-3 text-[#E01E26]" />
                    <span>{durationFormatted}</span>
                  </div>

                  <div className="relative my-2 flex w-full items-center justify-center">
                    <div className="h-[2px] w-full bg-slate-200 dark:bg-slate-700" />
                    <div className="absolute flex size-7 items-center justify-center rounded-full bg-red-50 text-[#E01E26] shadow-sm border border-red-200/60 dark:bg-red-950 dark:border-red-900/60 dark:text-red-400">
                      <Plane className="size-3.5 rotate-90" />
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Direct Route
                  </span>
                </div>

                {/* Destination */}
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {arrTime}
                  </span>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {flight.destination}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[110px] ml-auto">
                    {flight.destination_city}
                  </div>
                </div>
              </div>

              {/* Destination Visual Image Badge / Thumbnail */}
              <div className="relative w-full sm:w-36 h-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0 dark:border-slate-800 group/thumb bg-slate-900">
                <img
                  src={destinationImageUrl}
                  alt={`${flight.destination_city} destination`}
                  className="size-full object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                  onError={(e) => {
                    // Fallback to Cartagena if image fails
                    (e.target as HTMLImageElement).src =
                      'https://commons.wikimedia.org/wiki/Special:FilePath/Cartagena_skyline%2C_Colombia.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-300">
                    Destination
                  </span>
                  <span className="text-xs font-black text-white leading-tight drop-shadow truncate">
                    {flight.destination_city}
                  </span>
                </div>
                <div className="absolute top-1.5 right-1.5 rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-black text-white font-mono">
                  {flight.destination}
                </div>
              </div>
            </div>

            {/* Inventory & Amenities Indicators */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant={isLowSeats ? 'warning' : 'secondary'}
                  className="text-[11px] font-bold"
                >
                  {flight.seats_remaining} seats remaining
                </Badge>
                <Badge variant="economy" className="text-[11px]">
                  Economy: {flight.economy_seats_remaining}
                </Badge>
                <Badge variant="business" className="text-[11px]">
                  Business: {flight.business_seats_remaining}
                </Badge>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Luggage className="size-3 text-[#E01E26]" />
                  Carry-on 10kg
                </span>
                <span className="flex items-center gap-1">
                  <Wifi className="size-3 text-[#E01E26]" />
                  Wi-Fi Media
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  Hold Protection
                </span>
              </div>
            </div>
          </div>

          {/* Boarding Pass Perforation Divider (Desktop) */}
          <div className="relative hidden lg:flex flex-col justify-between items-center w-0 border-r-2 border-dashed border-slate-200 dark:border-slate-800">
            {/* Top punch notch */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 size-6 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
            {/* Bottom punch notch */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 size-6 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
          </div>

          {/* Boarding Pass Perforation Divider (Mobile) */}
          <div className="relative flex lg:hidden items-center justify-between w-full h-0 border-b-2 border-dashed border-slate-200 dark:border-slate-800 my-1">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800" />
          </div>

          {/* Boarding Pass Stub: Pricing & Actions */}
          <div className="flex flex-col justify-between gap-4 p-5 sm:p-6 lg:w-80 bg-slate-50/70 dark:bg-slate-800/30">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span>Fare Selection</span>
                <span>All Taxes Included</span>
              </div>

              {/* Economy Option */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Economy Class
                  </span>
                  <span className="text-xs font-bold text-slate-400">from</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    ${flight.base_price_economy.toLocaleString('en-US')}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">COP / pax</span>
                </div>
              </div>

              {/* Business Option */}
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-3 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Business Class
                  </span>
                  <span className="text-xs font-bold text-amber-700/70 dark:text-amber-400/70">
                    from
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-black text-amber-950 dark:text-amber-300">
                    ${flight.base_price_business.toLocaleString('en-US')}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700/80 dark:text-amber-400/80">
                    COP / pax
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={() => onSelectFlight(flight)}
                className="h-11 w-full rounded-xl bg-[#E01E26] font-black text-white shadow-md shadow-red-600/25 transition-all hover:bg-[#C0181E] active:scale-[0.98]"
              >
                <span>Select & Choose Seats</span>
                <ChevronRight className="size-4 ml-1" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(flight.id)}
                className="h-8 w-full text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <Info className="size-3.5 mr-1.5 text-[#E01E26]" />
                Flight Details & Amenities
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
