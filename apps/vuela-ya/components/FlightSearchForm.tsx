'use client';

import React, { useState, useEffect } from 'react';
import { Airport, CabinClass, SearchFlightsParams } from '@/lib/types';
import { ArrowLeftRight, Calendar, Users, Briefcase, Search, MapPin, Compass } from 'lucide-react';
import { Button } from './ui/button';

interface FlightSearchFormProps {
  onSearch: (params: SearchFlightsParams) => void;
  onShowAll?: () => void;
  isLoading?: boolean;
  isFiltered?: boolean;
}

export function FlightSearchForm({
  onSearch,
  onShowAll,
  isLoading,
  isFiltered,
}: FlightSearchFormProps) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [origin, setOrigin] = useState<string>('BOG');
  const [destination, setDestination] = useState<string>('MDE');
  const [departureDate, setDepartureDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().substring(0, 10);
  });
  const [passengers, setPassengers] = useState<number>(1);
  const [cabinClass, setCabinClass] = useState<CabinClass | 'all'>('all');
  const [fetchingAirports, setFetchingAirports] = useState<boolean>(true);

  // Fetch airports dynamically from /api/airports
  useEffect(() => {
    async function loadAirports() {
      try {
        setFetchingAirports(true);
        const res = await fetch('/api/airports');
        const data = await res.json();
        if (data.airports && Array.isArray(data.airports)) {
          setAirports(data.airports);
          if (data.airports.length >= 2) {
            setOrigin((prev) => (prev ? prev : data.airports[0].code));
            setDestination((prev) => (prev ? prev : data.airports[1].code));
          }
        }
      } catch (err) {
        console.error('Error fetching airports:', err);
      } finally {
        setFetchingAirports(false);
      }
    }
    loadAirports();
  }, []);

  const handleSwapAirports = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleQuickDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setDepartureDate(target.toISOString().substring(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !departureDate) return;

    onSearch({
      origin,
      destination,
      departure_date: departureDate,
      passengers,
      cabin_class: cabinClass === 'all' ? undefined : cabinClass,
    });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/98 p-6 shadow-2xl shadow-red-950/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/98 sm:p-8">
      {/* Subtle brand ambiance */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-red-600/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-amber-500/5 blur-3xl" />

      <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-red-50 text-[#E01E26] dark:bg-red-950 dark:text-red-400">
              <Compass className="size-4.5" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Search Domestic Flights Across Colombia
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                10 domestic destinations with live real-time seat inventory
              </p>
            </div>
          </div>

          {isFiltered && onShowAll && (
            <button
              type="button"
              onClick={onShowAll}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Reset & View All Flights
            </button>
          )}
        </div>

        {/* Airport Selectors */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-11 lg:items-center">
          {/* Origin */}
          <div className="space-y-1.5 lg:col-span-5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <MapPin className="size-3.5 text-[#E01E26]" />
              From (Origin Airport)
            </label>
            <div className="relative">
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                disabled={fetchingAirports}
                className="w-full appearance-none rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3.5 text-sm font-bold text-slate-900 shadow-inner transition-colors hover:border-slate-400 focus:border-[#E01E26] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:bg-slate-800"
              >
                {airports.map((airport) => (
                  <option key={airport.code} value={airport.code} disabled={airport.code === destination}>
                    {airport.city} ({airport.code}) - {airport.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center lg:col-span-1">
            <button
              type="button"
              onClick={handleSwapAirports}
              aria-label="Swap origin and destination"
              className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:scale-105 hover:border-red-200 hover:bg-red-50 hover:text-[#E01E26] active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeftRight className="size-4" />
            </button>
          </div>

          {/* Destination */}
          <div className="space-y-1.5 lg:col-span-5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <MapPin className="size-3.5 text-[#E01E26]" />
              To (Destination Airport)
            </label>
            <div className="relative">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={fetchingAirports}
                className="w-full appearance-none rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3.5 text-sm font-bold text-slate-900 shadow-inner transition-colors hover:border-slate-400 focus:border-[#E01E26] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:bg-slate-800"
              >
                {airports.map((airport) => (
                  <option key={airport.code} value={airport.code} disabled={airport.code === origin}>
                    {airport.city} ({airport.code}) - {airport.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Date, Passengers, Cabin Class & Submit */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Departure Date */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <Calendar className="size-3.5 text-[#E01E26]" />
              Departure Date
            </label>
            <input
              type="date"
              value={departureDate}
              min={new Date().toISOString().substring(0, 10)}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-900 shadow-inner transition-colors hover:border-slate-400 focus:border-[#E01E26] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:bg-slate-800"
              required
            />
            {/* Quick date shortcuts */}
            <div className="flex flex-wrap gap-1 pt-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickDate(0)}
                className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 hover:bg-red-50 hover:text-[#E01E26] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/60"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(1)}
                className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 hover:bg-red-50 hover:text-[#E01E26] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/60"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(3)}
                className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 hover:bg-red-50 hover:text-[#E01E26] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/60"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(7)}
                className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 hover:bg-red-50 hover:text-[#E01E26] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/60"
              >
                +7 Days
              </button>
            </div>
          </div>

          {/* Passengers */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <Users className="size-3.5 text-[#E01E26]" />
              Passengers
            </label>
            <div className="relative">
              <select
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value, 10))}
                className="w-full appearance-none rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-900 shadow-inner transition-colors hover:border-slate-400 focus:border-[#E01E26] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
              >
                <option value={1}>1 Passenger</option>
                <option value={2}>2 Passengers</option>
                <option value={3}>3 Passengers</option>
                <option value={4}>4 Passengers</option>
                <option value={5}>5 Passengers</option>
                <option value={6}>6 Passengers</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Cabin Class */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <Briefcase className="size-3.5 text-[#E01E26]" />
              Cabin Class
            </label>
            <div className="relative">
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value as CabinClass | 'all')}
                className="w-full appearance-none rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-900 shadow-inner transition-colors hover:border-slate-400 focus:border-[#E01E26] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
              >
                <option value="all">All Cabin Classes</option>
                <option value="economy">Economy Only</option>
                <option value="business">Business Only</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Search Button */}
          <div className="flex flex-col justify-end">
            <Button
              type="submit"
              disabled={isLoading || fetchingAirports}
              className="h-[46px] w-full rounded-2xl bg-[#E01E26] font-black text-white shadow-lg shadow-red-600/25 transition-all hover:bg-[#C0181E] active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Searching...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="size-4.5" />
                  <span>Search Flights</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
