'use client';

import React, { useState, useEffect } from 'react';
import { FlightDetailsResult, FlightSearchResult } from '@/lib/types';
import { getCityImageUrl } from '@/lib/city-images';
import {
  X,
  Wifi,
  Coffee,
  Luggage,
  BatteryCharging,
  ChevronRight,
  Plane,
  Clock,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface FlightDetailModalProps {
  flightId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectFlight: (flight: FlightSearchResult) => void;
}

export function FlightDetailModal({
  flightId,
  isOpen,
  onClose,
  onSelectFlight,
}: FlightDetailModalProps) {
  const [flight, setFlight] = useState<FlightDetailsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !flightId) return;

    async function fetchDetails() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/flights/${flightId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch flight details');
        }
        setFlight(data.flight);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading flight details');
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [isOpen, flightId]);

  if (!isOpen) return null;

  const destinationImageUrl = flight ? getCityImageUrl(flight.destination.code) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="size-12 animate-spin rounded-full border-4 border-[#E01E26] border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">
              Loading flight itinerary & amenities...
            </p>
          </div>
        ) : error || !flight ? (
          <div className="p-8 text-center">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <p className="font-bold">{error || 'Flight itinerary not found'}</p>
            </div>
            <Button onClick={onClose} variant="outline" className="mt-6">
              Close Window
            </Button>
          </div>
        ) : (
          <>
            {/* Scrollable Container with Hero Banner at the top */}
            <div className="flex-1 overflow-y-auto">
              {/* Destination Hero Banner */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950">
                <img
                  src={destinationImageUrl}
                  alt={`${flight.destination.city} destination`}
                  className="size-full object-cover object-center opacity-85"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://commons.wikimedia.org/wiki/Special:FilePath/Cartagena_skyline%2C_Colombia.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-black/40" />

                {/* Top Nav over Banner */}
                <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#E01E26] px-3 py-1 font-mono text-xs font-black text-white shadow-md">
                      {flight.flight_number}
                    </span>
                    <span className="rounded-lg bg-black/50 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-white border border-white/20">
                      {flight.aircraft_type}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-emerald-400/50 bg-emerald-950/60 text-[10px] font-bold text-emerald-300 backdrop-blur-md"
                    >
                      Non-Stop Direct
                    </Badge>
                  </div>

                  <button
                    onClick={onClose}
                    aria-label="Close details"
                    className="flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/70 hover:scale-105"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Destination Name & Airport Badge */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-10">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-red-400">
                    <MapPin className="size-3.5" />
                    <span>Destination</span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mt-0.5">
                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
                      {flight.destination.city}
                    </h2>
                    <div className="rounded-xl bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20">
                      {flight.destination.name} ({flight.destination.code})
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Timeline & Details Content */}
              <div className="p-5 sm:p-6 space-y-6">
                {/* Route Timeline Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/50 shadow-xs">
                  <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
                    {/* Departure */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Departure
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {new Date(flight.departure_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {flight.origin.city} ({flight.origin.code})
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                        {flight.origin.name}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#E01E26] dark:text-red-400">
                        {new Date(flight.departure_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>

                    {/* Path Center */}
                    <div className="flex flex-col items-center justify-center px-1">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <Clock className="size-3.5 text-[#E01E26]" />
                        <span>{flight.duration_minutes} min</span>
                      </div>
                      <div className="relative my-2 flex w-full items-center justify-center">
                        <div className="h-[2px] w-full bg-slate-300 dark:bg-slate-700" />
                        <div className="absolute flex size-8 items-center justify-center rounded-full bg-red-100 text-[#E01E26] border border-red-300 shadow-sm dark:bg-red-950 dark:border-red-900 dark:text-red-400">
                          <Plane className="size-4 rotate-90" />
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        Non-Stop
                      </Badge>
                    </div>

                    {/* Arrival */}
                    <div className="text-right">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Arrival
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {new Date(flight.arrival_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {flight.destination.city} ({flight.destination.code})
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px] ml-auto">
                        {flight.destination.name}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#E01E26] dark:text-red-400">
                        {new Date(flight.arrival_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cabin Classes & Live Availability */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                      Cabin Classes & Real-Time Availability
                    </h3>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {flight.seat_availability.available_seats} total seats open
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Economy Card */}
                    <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                      <div className="flex items-center justify-between">
                        <Badge variant="economy">Economy Class</Badge>
                        <span className="text-xs font-bold text-[#C0181E] dark:text-red-300">
                          {flight.seat_availability.economy.available} of{' '}
                          {flight.seat_availability.economy.total} available
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          ${flight.base_price_economy.toLocaleString('en-US')}
                        </span>
                        <span className="text-xs font-bold text-slate-500">COP</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Standard ergonomic seat with 31-inch pitch, USB port, and complimentary 10kg carry-on baggage.
                      </p>
                    </div>

                    {/* Business Card */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <div className="flex items-center justify-between">
                        <Badge variant="business">Business Class</Badge>
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                          {flight.seat_availability.business.available} of{' '}
                          {flight.seat_availability.business.total} available
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-amber-950 dark:text-amber-300">
                          ${flight.base_price_business.toLocaleString('en-US')}
                        </span>
                        <span className="text-xs font-bold text-amber-700/80 dark:text-amber-400/80">
                          COP
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-amber-900/90 dark:text-amber-400/90 leading-relaxed">
                        Priority boarding, generous 38-inch legroom, 23kg checked bag, and complimentary premium service.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Included Amenities & Flight Policies */}
                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                    Included Amenities & Services
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <Luggage className="size-4 text-[#E01E26] shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        10kg Carry-On
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <Wifi className="size-4 text-[#E01E26] shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Wi-Fi Streaming
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <BatteryCharging className="size-4 text-[#E01E26] shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        USB Power Outlets
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <Coffee className="size-4 text-[#E01E26] shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Colombian Coffee
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hold Protection Notice */}
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>10-Minute Lock Guarantee:</strong> Selected seats are instantly reserved with atomic concurrency protection while completing checkout.
                  </span>
                </div>
              </div>
            </div>

            {/* Fixed Footer Action */}
            <div className="border-t border-slate-100 p-4 sm:p-5 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Starting from</div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  ${flight.base_price_economy.toLocaleString('en-US')}{' '}
                  <span className="text-xs font-normal text-slate-400">COP</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  onClose();
                  onSelectFlight({
                    id: flight.id,
                    flight_number: flight.flight_number,
                    origin: flight.origin.code,
                    origin_city: flight.origin.city,
                    destination: flight.destination.code,
                    destination_city: flight.destination.city,
                    departure_at: flight.departure_at,
                    arrival_at: flight.arrival_at,
                    duration_minutes: flight.duration_minutes,
                    price: flight.base_price_economy,
                    base_price_economy: flight.base_price_economy,
                    base_price_business: flight.base_price_business,
                    aircraft_type: flight.aircraft_type,
                    seats_remaining: flight.seat_availability.available_seats,
                    economy_seats_remaining: flight.seat_availability.economy.available,
                    business_seats_remaining: flight.seat_availability.business.available,
                    cabin_classes: ['economy', 'business'],
                  });
                }}
                className="h-12 w-full sm:w-auto px-6 rounded-2xl bg-[#E01E26] font-black text-white shadow-lg shadow-red-600/25 transition-all hover:bg-[#C0181E] active:scale-[0.98]"
              >
                <span>Proceed to Seat Selection</span>
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
