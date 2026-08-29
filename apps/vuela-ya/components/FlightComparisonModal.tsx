'use client';

import React, { useState, useEffect } from 'react';
import { FlightSearchResult } from '@/lib/types';
import { getCityImageUrl } from '@/lib/city-images';
import { X, Clock, Check, ChevronRight, Plane, MapPin } from 'lucide-react';
import { Button } from './ui/button';

interface FlightComparisonModalProps {
  flightIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSelectFlight: (flight: FlightSearchResult) => void;
}

export function FlightComparisonModal({
  flightIds,
  isOpen,
  onClose,
  onSelectFlight,
}: FlightComparisonModalProps) {
  const [flights, setFlights] = useState<FlightSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || flightIds.length < 2) return;

    async function fetchComparison() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/flights/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flight_ids: flightIds }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to compare flights');
        }

        setFlights(data.flights);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error comparing flights');
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [isOpen, flightIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Flight Comparison
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Side-by-side domestic flight schedules, fares, and destination amenities
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comparison"
            className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="size-10 animate-spin rounded-full border-4 border-[#E01E26] border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                Loading side-by-side flight comparison...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <p className="font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Tab Switcher */}
              <div className="mb-4 flex gap-2 overflow-x-auto pb-2 md:hidden">
                {flights.map((f, idx) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveTab(idx)}
                    className={`flex-1 min-w-[140px] rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      activeTab === idx
                        ? 'bg-[#E01E26] text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {f.flight_number} • {f.origin} → {f.destination}
                  </button>
                ))}
              </div>

              {/* Comparison Grid */}
              <div
                className={`grid grid-cols-1 gap-6 md:grid-cols-${Math.min(
                  flights.length,
                  3
                )} lg:grid-cols-${flights.length}`}
              >
                {flights.map((flight, idx) => {
                  const isVisibleOnMobile = activeTab === idx;
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
                  const destinationImageUrl = getCityImageUrl(flight.destination);

                  return (
                    <div
                      key={flight.id}
                      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
                        isVisibleOnMobile ? 'flex' : 'hidden md:flex'
                      }`}
                    >
                      {/* City Visual Preview Header Banner */}
                      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-950 group">
                        <img
                          src={destinationImageUrl}
                          alt={`${flight.destination_city} preview`}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://commons.wikimedia.org/wiki/Special:FilePath/Cartagena_skyline%2C_Colombia.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30" />

                        {/* Top Badges */}
                        <div className="relative z-10 flex items-center justify-between p-3">
                          <span className="rounded-md bg-[#E01E26] px-2 py-0.5 font-mono text-xs font-black text-white shadow-xs">
                            {flight.flight_number}
                          </span>
                          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm border border-white/20">
                            {flight.aircraft_type}
                          </span>
                        </div>

                        {/* Bottom Overlay Info */}
                        <div className="absolute bottom-2.5 left-3 right-3 z-10">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
                            <MapPin className="size-3" />
                            <span>Destination</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <h3 className="text-base font-black text-white drop-shadow">
                              {flight.destination_city}
                            </h3>
                            <span className="font-mono text-xs font-bold text-white bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                              {flight.destination}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Flight Timings & Route Line */}
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <div className="text-lg font-black text-slate-900 dark:text-white">
                              {depTime}
                            </div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {flight.origin_city} ({flight.origin})
                            </div>
                          </div>

                          <div className="flex flex-col items-center px-2">
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              <Clock className="size-3 text-[#E01E26]" />
                              <span>{flight.duration_minutes}m</span>
                            </div>
                            <div className="my-1 flex items-center">
                              <div className="h-[2px] w-6 bg-red-200 dark:bg-red-800" />
                              <Plane className="size-3 text-[#E01E26] mx-1 rotate-90" />
                              <div className="h-[2px] w-6 bg-red-200 dark:bg-red-800" />
                            </div>
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              Non-Stop
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-black text-slate-900 dark:text-white">
                              {arrTime}
                            </div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {flight.destination_city} ({flight.destination})
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Comparison */}
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                        {/* Economy Price */}
                        <div className="flex items-center justify-between rounded-xl bg-white p-2.5 shadow-2xs border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Economy
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {flight.economy_seats_remaining} seats left
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-slate-900 dark:text-white">
                              ${flight.base_price_economy.toLocaleString('en-US')}
                            </div>
                            <div className="text-[9px] text-slate-400">COP / pax</div>
                          </div>
                        </div>

                        {/* Business Price */}
                        <div className="flex items-center justify-between rounded-xl bg-amber-50/70 p-2.5 shadow-2xs border border-amber-200 dark:border-amber-900/40 dark:bg-amber-950/20">
                          <div>
                            <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                              Business
                            </div>
                            <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                              {flight.business_seats_remaining} seats left
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-amber-950 dark:text-amber-300">
                              ${flight.base_price_business.toLocaleString('en-US')}
                            </div>
                            <div className="text-[9px] text-amber-700/80 dark:text-amber-400/80">
                              COP / pax
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Included Features List */}
                      <div className="flex-1 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-emerald-600 shrink-0" />
                          <span>10kg Carry-on baggage included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-emerald-600 shrink-0" />
                          <span>Live interactive seat map selection</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-emerald-600 shrink-0" />
                          <span>10-minute price & seat lock guarantee</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-emerald-600 shrink-0" />
                          <span>Instant digital boarding pass</span>
                        </div>
                      </div>

                      {/* Select Action Button */}
                      <div className="p-4 pt-0">
                        <Button
                          onClick={() => {
                            onClose();
                            onSelectFlight(flight);
                          }}
                          className="w-full rounded-xl bg-[#E01E26] font-black text-white shadow-md shadow-red-600/20 hover:bg-[#C0181E] active:scale-[0.98] transition-all"
                        >
                          <span>Select This Flight</span>
                          <ChevronRight className="size-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
