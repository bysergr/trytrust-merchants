'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  FlightSearchResult,
  PayResult,
  SearchFlightsParams,
  Seat,
} from '@/lib/types';
import { POPULAR_DESTINATIONS, getCityImageUrl } from '@/lib/city-images';
import { Navbar } from '@/components/Navbar';
import { FlightSearchForm } from '@/components/FlightSearchForm';
import { FlightCard } from '@/components/FlightCard';
import { FlightComparisonModal } from '@/components/FlightComparisonModal';
import { FlightDetailModal } from '@/components/FlightDetailModal';
import { SeatSelectionModal } from '@/components/SeatSelectionModal';
import { CheckoutModal } from '@/components/CheckoutModal';
import { BookingConfirmedModal } from '@/components/BookingConfirmedModal';
import { McpInfoModal } from '@/components/McpInfoModal';
import {
  ArrowUpDown,
  CheckSquare,
  MapPin,
  Compass,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [flights, setFlights] = useState<FlightSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentSearchParams, setCurrentSearchParams] = useState<SearchFlightsParams | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<'price_asc' | 'dep_asc' | 'duration_asc'>('price_asc');

  // Compared flights (flight IDs)
  const [comparedFlightIds, setComparedFlightIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Flight Detail Modal
  const [selectedDetailFlightId, setSelectedDetailFlightId] = useState<string | null>(null);

  // Seat Selection Modal
  const [activeBookingFlight, setActiveBookingFlight] = useState<FlightSearchResult | null>(null);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);

  // Checkout Modal
  const [heldSeatsForCheckout, setHeldSeatsForCheckout] = useState<Seat[]>([]);
  const [totalPriceForCheckout, setTotalPriceForCheckout] = useState<number>(0);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);

  // Confirmed Booking Modal
  const [confirmedOrder, setConfirmedOrder] = useState<PayResult | null>(null);
  const [isConfirmedModalOpen, setIsConfirmedModalOpen] = useState<boolean>(false);

  // MCP Info Modal
  const [isMcpModalOpen, setIsMcpModalOpen] = useState<boolean>(false);

  // Load all flights initially
  const loadAllFlights = useCallback(async () => {
    try {
      setLoading(true);
      setHasSearched(false);
      setCurrentSearchParams(null);
      const res = await fetch('/api/flights');
      const data = await res.json();
      if (data.flights && Array.isArray(data.flights)) {
        setFlights(data.flights);
      } else {
        setFlights([]);
      }
    } catch (err) {
      console.error('Error loading all flights:', err);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialFetch() {
      try {
        setLoading(true);
        const res = await fetch('/api/flights');
        const data = await res.json();
        if (active) {
          if (data.flights && Array.isArray(data.flights)) {
            setFlights(data.flights);
          } else {
            setFlights([]);
          }
        }
      } catch (err) {
        console.error('Error on initial flight load:', err);
        if (active) setFlights([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialFetch();

    return () => {
      active = false;
    };
  }, []);

  const handleSearch = useCallback(async (params: SearchFlightsParams) => {
    try {
      setLoading(true);
      setCurrentSearchParams(params);
      setHasSearched(true);

      const query = new URLSearchParams({
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departure_date,
        passengers: String(params.passengers || 1),
      });

      if (params.cabin_class) {
        query.set('cabin_class', params.cabin_class);
      }

      const res = await fetch(`/api/flights?${query.toString()}`);
      const data = await res.json();

      if (data.flights && Array.isArray(data.flights)) {
        setFlights(data.flights);
      } else {
        setFlights([]);
      }
    } catch (err) {
      console.error('Search flights error:', err);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // One-click destination search trigger
  const handleDestinationSelect = useCallback((destinationCode: string) => {
    const originCode = destinationCode === 'BOG' ? 'MDE' : 'BOG';
    const today = new Date().toISOString().substring(0, 10);
    const searchParams: SearchFlightsParams = {
      origin: originCode,
      destination: destinationCode,
      departure_date: today,
      passengers: 1,
    };
    handleSearch(searchParams);

    // Smooth scroll down to the flight results section
    const resultsElement = document.getElementById('flight-results-section');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [handleSearch]);

  // Toggle compare selection
  const handleToggleCompare = (flightId: string) => {
    setComparedFlightIds((prev) => {
      if (prev.includes(flightId)) {
        return prev.filter((id) => id !== flightId);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, flightId];
    });
  };

  // View Details trigger
  const handleViewDetails = (flightId: string) => {
    setSelectedDetailFlightId(flightId);
  };

  // Select Flight -> Open Seat Map
  const handleSelectFlight = (flight: FlightSearchResult) => {
    setActiveBookingFlight(flight);
    setIsSeatModalOpen(true);
  };

  // Seat Selection completed -> Proceed to Checkout
  const handleProceedToCheckout = (heldSeats: Seat[], totalPrice: number) => {
    setHeldSeatsForCheckout(heldSeats);
    setTotalPriceForCheckout(totalPrice);
    setIsSeatModalOpen(false);
    setIsCheckoutModalOpen(true);
  };

  // Payment completed
  const handlePaymentSuccess = (result: PayResult) => {
    setIsCheckoutModalOpen(false);
    setConfirmedOrder(result);
    setIsConfirmedModalOpen(true);
    if (hasSearched && currentSearchParams) {
      handleSearch(currentSearchParams);
    } else {
      loadAllFlights();
    }
  };

  // Reset booking process
  const handleNewBooking = () => {
    setIsConfirmedModalOpen(false);
    setConfirmedOrder(null);
    setActiveBookingFlight(null);
    setHeldSeatsForCheckout([]);
  };

  // Sort flights
  const sortedFlights = [...flights].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return a.price - b.price;
    }
    if (sortBy === 'dep_asc') {
      return new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime();
    }
    if (sortBy === 'duration_asc') {
      return a.duration_minutes - b.duration_minutes;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#E01E26] selection:text-white dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Navbar */}
      <Navbar onOpenMcpModal={() => setIsMcpModalOpen(true)} />

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {/* Deep Aviation Blue Hero with Signature Avianca Red Zones */}
        <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-sky-950 via-[#0B1528] to-[#070D18] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8">
          {/* Top Avianca Red Brand Horizon Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#E01E26]" />

          {/* Ambient Glowing Avianca Red Accents & Night Sky Grid */}
          <div className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-[#E01E26]/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-10 size-96 rounded-full bg-[#E01E26]/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(224,30,38,0.2),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#38bdf808_1px,transparent_1px),linear-gradient(to_bottom,#38bdf808_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />

          <div className="relative mx-auto max-w-5xl space-y-8">
            <div className="text-center space-y-3">
              {/* Avianca Red Hero Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-[#E01E26] px-4 py-1 text-xs font-black text-white shadow-md shadow-red-950/30">
                <span className="size-2 rounded-full bg-white animate-pulse" />
                <span>DOMESTIC AIRLINE OF COLOMBIA • 10 CONNECTED HUBS</span>
              </div>

              {/* Title with solid red brand mark */}
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Fly Colombia with <span className="text-[#E01E26] bg-white/95 px-3 py-0.5 rounded-2xl inline-block ml-1 shadow-md">VUELA YA</span>
              </h1>
              <p className="mx-auto max-w-2xl text-sm font-normal text-slate-300 sm:text-base leading-relaxed">
                Search real-time domestic schedules, compare cabin fares across 10 hubs, select live aircraft seats, and secure bookings with instantaneous atomic hold protection.
              </p>
            </div>

            {/* Flight Search Box */}
            <FlightSearchForm
              onSearch={handleSearch}
              onShowAll={loadAllFlights}
              isFiltered={hasSearched}
              isLoading={loading}
            />
          </div>
        </section>

        {/* Search Results & Filters Section */}
        <section id="flight-results-section" className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-8">
          {/* Results Header with Sorting and Counts */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {hasSearched ? (
                    <>
                      Featured Scheduled Flights{' '}
                      {currentSearchParams && (
                        <span className="text-[#E01E26] dark:text-red-400">
                          ({currentSearchParams.origin} → {currentSearchParams.destination})
                        </span>
                      )}
                    </>
                  ) : (
                    'All Scheduled Domestic Flights'
                  )}
                </h2>
                {hasSearched && (
                  <button
                    onClick={loadAllFlights}
                    className="flex items-center gap-1 text-xs font-bold text-[#E01E26] hover:underline"
                  >
                    <RotateCcw className="size-3" />
                    <span>View All Flights</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {flights.length} scheduled flights available across Colombian routes
              </p>
            </div>

            {/* Sorting Filter */}
            {flights.length > 0 && (
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'price_asc' | 'dep_asc' | 'duration_asc')}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:border-[#E01E26] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="price_asc">Lowest Price</option>
                  <option value="dep_asc">Earliest Departure</option>
                  <option value="duration_asc">Shortest Duration</option>
                </select>
              </div>
            )}
          </div>

          {/* Flight Cards List */}
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-3 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <div className="grid grid-cols-3 gap-4">
                          <Skeleton className="h-10 w-24" />
                          <Skeleton className="h-10 w-24" />
                          <Skeleton className="h-10 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-20 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedFlights.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-100 text-[#E01E26] dark:bg-red-950 dark:text-red-400">
                  <Compass className="size-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  No flights found for this specific route and date
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Try selecting another upcoming date or clear filters to view all scheduled flights.
                </p>
                <Button
                  onClick={loadAllFlights}
                  variant="outline"
                  size="sm"
                  className="mt-4 font-bold"
                >
                  View All Domestic Flights
                </Button>
              </div>
            ) : (
              sortedFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  isCompared={comparedFlightIds.includes(flight.id)}
                  onToggleCompare={handleToggleCompare}
                  onSelectFlight={handleSelectFlight}
                  onViewDetails={handleViewDetails}
                />
              ))
            )}
          </div>

          {/* Top Colombian Destinations Showcase Section */}
          <div className="mt-16 border-t border-slate-200 pt-10 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-[#E01E26]" />
                  <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Explore Top Colombian Destinations
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Direct non-stop flights connecting 10 major hubs across Colombia. Click any city to view live scheduled flights.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                10 Destinations • Real-Time Availability
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {POPULAR_DESTINATIONS.map((dest) => {
                const imageUrl = dest.image || getCityImageUrl(dest.code);
                const isCurrentDestination =
                  currentSearchParams?.destination === dest.code;

                return (
                  <div
                    key={dest.code}
                    onClick={() => handleDestinationSelect(dest.code)}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 cursor-pointer ${
                      isCurrentDestination
                        ? 'border-[#E01E26] ring-2 ring-[#E01E26]/20'
                        : 'border-slate-200 hover:border-red-300 dark:border-slate-800 dark:hover:border-red-800'
                    }`}
                  >
                    {/* Destination Photo Banner */}
                    <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                      <Image
                        src={imageUrl}
                        alt={`${dest.city}, Colombia`}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/20" />

                      {/* Header Badges */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                        <span className="inline-flex items-center rounded-md bg-black/70 px-2 py-0.5 font-mono text-[11px] font-black text-white backdrop-blur-md border border-white/10 shadow-xs">
                          {dest.code}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#E01E26] px-2 py-0.5 text-[9px] font-extrabold text-white shadow-xs">
                          {dest.tag}
                        </span>
                      </div>

                      {/* Bottom Image Label */}
                      <div className="absolute bottom-2.5 inset-x-3 text-white">
                        <h4 className="text-base font-black tracking-tight leading-tight drop-shadow-sm">
                          {dest.city}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-200 truncate">
                          {dest.region}
                        </p>
                      </div>
                    </div>

                    {/* Card Content & Action */}
                    <div className="flex flex-1 flex-col justify-between p-3.5 gap-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {dest.description}
                      </p>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400">
                            Starting from
                          </span>
                          <span className="text-xs font-black text-[#E01E26] dark:text-red-400">
                            ${dest.fromPrice.toLocaleString('en-US')}{' '}
                            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-400">
                              COP
                            </span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDestinationSelect(dest.code);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-800 transition-colors group-hover:bg-[#E01E26] group-hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-[#E01E26] dark:group-hover:text-white"
                        >
                          <span>Search</span>
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Floating Compare Bar */}
        {comparedFlightIds.length > 0 && (
          <div className="fixed bottom-6 inset-x-4 z-30 mx-auto max-w-xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between rounded-2xl border border-red-400 bg-slate-950/95 p-3.5 text-white shadow-2xl backdrop-blur-md dark:border-red-700">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckSquare className="size-4 text-[#E01E26]" />
                <span>{comparedFlightIds.length} flights selected to compare</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setComparedFlightIds([])}
                  className="h-8 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </Button>

                <Button
                  size="sm"
                  disabled={comparedFlightIds.length < 2}
                  onClick={() => setIsCompareModalOpen(true)}
                  className="h-8 rounded-xl bg-[#E01E26] px-4 text-xs font-bold text-white hover:bg-[#C0181E] disabled:opacity-40"
                >
                  Compare ({comparedFlightIds.length})
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <div className="mx-auto max-w-5xl px-4 space-y-2">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            VUELA YA • Colombian Domestic Aviation Platform
          </p>
          <p>
            Serving Bogota, Medellin, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, San Andres, Santa Marta, and Cucuta.
          </p>
          <p className="text-[11px] text-slate-400">
            Next.js App Router • SQLite Local Database • Model Context Protocol (MCP) Server.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <FlightComparisonModal
        flightIds={comparedFlightIds}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onSelectFlight={handleSelectFlight}
      />

      <FlightDetailModal
        flightId={selectedDetailFlightId}
        isOpen={Boolean(selectedDetailFlightId)}
        onClose={() => setSelectedDetailFlightId(null)}
        onSelectFlight={handleSelectFlight}
      />

      <SeatSelectionModal
        flight={activeBookingFlight}
        passengersCount={currentSearchParams?.passengers || 1}
        isOpen={isSeatModalOpen}
        onClose={() => setIsSeatModalOpen(false)}
        onProceedToCheckout={handleProceedToCheckout}
      />

      <CheckoutModal
        flight={activeBookingFlight}
        heldSeats={heldSeatsForCheckout}
        totalPrice={totalPriceForCheckout}
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <BookingConfirmedModal
        order={confirmedOrder}
        isOpen={isConfirmedModalOpen}
        onClose={() => setIsConfirmedModalOpen(false)}
        onNewBooking={handleNewBooking}
      />

      <McpInfoModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
      />
    </div>
  );
}
