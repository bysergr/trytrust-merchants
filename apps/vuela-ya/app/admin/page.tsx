'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FlightSearchResult,
} from '@/lib/types';
import { VuelaYaLogo } from '@/components/VuelaYaLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  ArrowLeft,
  RefreshCw,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Plane,
  ArrowUpDown,
  Filter,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from 'lucide-react';

interface RowEditState {
  flight_number: string;
  base_price_economy: number;
  base_price_business: number;
  departure_at_local: string;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

function toLocalDateTimeInputValue(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatFlightDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function formatFlightTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export default function AdminPage() {
  const [flights, setFlights] = useState<FlightSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dep_asc' | 'dep_desc' | 'eco_asc' | 'eco_desc' | 'flight_asc'>('dep_asc');

  // Inline Row Editing State (key = flightId)
  const [editingRows, setEditingRows] = useState<Record<string, RowEditState>>({});
  const [savingFlightIds, setSavingFlightIds] = useState<Record<string, boolean>>({});
  const [recentlyUpdatedFlightIds, setRecentlyUpdatedFlightIds] = useState<Record<string, boolean>>({});

  // Modal Editing State
  const [modalFlight, setModalFlight] = useState<FlightSearchResult | null>(null);
  const [modalEditState, setModalEditState] = useState<RowEditState | null>(null);
  const [isModalSaving, setIsModalSaving] = useState<boolean>(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all flights from API
  const fetchFlights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/flights?limit=500');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load flights catalog');
      }
      if (data.flights && Array.isArray(data.flights)) {
        setFlights(data.flights);
      } else {
        setFlights([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching flight operations data';
      setError(msg);
      addToast('error', 'Failed to Load Flights', msg);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let active = true;

    async function initialFetch() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/flights?limit=500');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load flights catalog');
        }
        if (active) {
          if (data.flights && Array.isArray(data.flights)) {
            setFlights(data.flights);
          } else {
            setFlights([]);
          }
        }
      } catch (err) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error fetching flight operations data';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      active = false;
    };
  }, []);

  // Unique Routes and Dates for quick filter dropdowns
  const uniqueRoutes = useMemo(() => {
    const map = new Map<string, string>();
    flights.forEach((f) => {
      const key = `${f.origin}-${f.destination}`;
      const label = `${f.origin_city} (${f.origin}) → ${f.destination_city} (${f.destination})`;
      if (!map.has(key)) {
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [flights]);

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => {
      const datePart = f.departure_at.substring(0, 10);
      set.add(datePart);
    });
    return Array.from(set).sort();
  }, [flights]);

  // Filtered and Sorted Flights
  const filteredFlights = useMemo(() => {
    return flights
      .filter((flight) => {
        // Search query filter (flight number, cities, airport codes)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchFlightNumber = flight.flight_number.toLowerCase().includes(q);
          const matchOriginCity = flight.origin_city.toLowerCase().includes(q);
          const matchDestCity = flight.destination_city.toLowerCase().includes(q);
          const matchOriginCode = flight.origin.toLowerCase().includes(q);
          const matchDestCode = flight.destination.toLowerCase().includes(q);
          const matchAircraft = flight.aircraft_type.toLowerCase().includes(q);

          if (
            !matchFlightNumber &&
            !matchOriginCity &&
            !matchDestCity &&
            !matchOriginCode &&
            !matchDestCode &&
            !matchAircraft
          ) {
            return false;
          }
        }

        // Route filter
        if (selectedRoute !== 'all') {
          const routeKey = `${flight.origin}-${flight.destination}`;
          if (routeKey !== selectedRoute) return false;
        }

        // Date filter
        if (selectedDateFilter !== 'all') {
          const datePart = flight.departure_at.substring(0, 10);
          if (datePart !== selectedDateFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'dep_asc') {
          return new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime();
        }
        if (sortBy === 'dep_desc') {
          return new Date(b.departure_at).getTime() - new Date(a.departure_at).getTime();
        }
        if (sortBy === 'eco_asc') {
          return a.base_price_economy - b.base_price_economy;
        }
        if (sortBy === 'eco_desc') {
          return b.base_price_economy - a.base_price_economy;
        }
        if (sortBy === 'flight_asc') {
          return a.flight_number.localeCompare(b.flight_number);
        }
        return 0;
      });
  }, [flights, searchQuery, selectedRoute, selectedDateFilter, sortBy]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = flights.length;
    if (total === 0) return { total: 0, avgEco: 0, avgBus: 0, routesCount: 0 };
    const avgEco = Math.round(flights.reduce((sum, f) => sum + f.base_price_economy, 0) / total);
    const avgBus = Math.round(flights.reduce((sum, f) => sum + f.base_price_business, 0) / total);
    return {
      total,
      avgEco,
      avgBus,
      routesCount: uniqueRoutes.length,
    };
  }, [flights, uniqueRoutes]);

  // Inline editing handlers
  const handleStartRowEdit = (flight: FlightSearchResult) => {
    setEditingRows((prev) => ({
      ...prev,
      [flight.id]: {
        flight_number: flight.flight_number,
        base_price_economy: flight.base_price_economy,
        base_price_business: flight.base_price_business,
        departure_at_local: toLocalDateTimeInputValue(flight.departure_at),
      },
    }));
  };

  const handleCancelRowEdit = (flightId: string) => {
    setEditingRows((prev) => {
      const next = { ...prev };
      delete next[flightId];
      return next;
    });
  };

  const handleRowFieldChange = (
    flightId: string,
    field: keyof RowEditState,
    value: string | number
  ) => {
    setEditingRows((prev) => {
      const current = prev[flightId];
      if (!current) return prev;
      return {
        ...prev,
        [flightId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Save flight updates (both inline and modal)
  const handleSaveFlight = async (flightId: string, editState: RowEditState) => {
    // Validation
    if (editState.base_price_economy <= 0 || isNaN(editState.base_price_economy)) {
      addToast('error', 'Invalid Economy Price', 'Economy price must be a positive number.');
      return;
    }
    if (editState.base_price_business <= 0 || isNaN(editState.base_price_business)) {
      addToast('error', 'Invalid Business Price', 'Business price must be a positive number.');
      return;
    }
    if (!editState.departure_at_local) {
      addToast('error', 'Missing Departure Date', 'Please specify a valid departure date and time.');
      return;
    }

    const departureIso = new Date(editState.departure_at_local).toISOString();
    if (isNaN(new Date(departureIso).getTime())) {
      addToast('error', 'Invalid Date Format', 'The specified departure date and time is invalid.');
      return;
    }

    try {
      setSavingFlightIds((prev) => ({ ...prev, [flightId]: true }));

      const response = await fetch(`/api/flights/${flightId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_price_economy: Number(editState.base_price_economy),
          base_price_business: Number(editState.base_price_business),
          departure_at: departureIso,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update flight');
      }

      const updatedFlight: FlightSearchResult = result.flight;

      // Update local state without full reload
      setFlights((prevFlights) =>
        prevFlights.map((f) => (f.id === flightId ? updatedFlight : f))
      );

      // Clear inline edit state
      handleCancelRowEdit(flightId);

      // Close modal if editing via modal
      if (modalFlight?.id === flightId) {
        setModalFlight(null);
        setModalEditState(null);
      }

      // Mark row as recently updated with flash animation
      setRecentlyUpdatedFlightIds((prev) => ({ ...prev, [flightId]: true }));
      setTimeout(() => {
        setRecentlyUpdatedFlightIds((prev) => {
          const next = { ...prev };
          delete next[flightId];
          return next;
        });
      }, 4000);

      addToast(
        'success',
        'Flight Updated Successfully',
        `Flight ${updatedFlight.flight_number} fares & schedule have been updated.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred while updating the flight';
      addToast('error', 'Update Failed', msg);
    } finally {
      setSavingFlightIds((prev) => {
        const next = { ...prev };
        delete next[flightId];
        return next;
      });
      setIsModalSaving(false);
    }
  };

  // Open modal edit
  const handleOpenEditModal = (flight: FlightSearchResult) => {
    setModalFlight(flight);
    setModalEditState({
      flight_number: flight.flight_number,
      base_price_economy: flight.base_price_economy,
      base_price_business: flight.base_price_business,
      departure_at_local: toLocalDateTimeInputValue(flight.departure_at),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#E01E26] selection:text-white dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Avianca Horizon Line */}
      <div className="h-1.5 w-full bg-[#E01E26] sticky top-0 z-50" />

      {/* Main Admin Header */}
      <header className="sticky top-1.5 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand & Panel Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
              <VuelaYaLogo size={36} className="size-9 shrink-0 shadow-sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-[#E01E26] dark:text-red-500">
                    VUELA YA
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Operations
                  </span>
                </div>
                <h1 className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Flight Operations Admin Panel
                </h1>
              </div>
            </Link>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFlights}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>

            <Link href="/">
              <Button
                variant="default"
                size="sm"
                className="flex items-center gap-1.5 rounded-xl bg-[#E01E26] font-bold text-white shadow-sm hover:bg-[#C0181E] text-xs"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Public Site</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 pb-20 pt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Top Banner / Metrics Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Flights Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Total Flights
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-red-50 text-[#E01E26] dark:bg-red-950/60 dark:text-red-400">
                  <Plane className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.total}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Scheduled
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                10 Colombian Hubs & Domestic Sectors
              </p>
            </div>

            {/* Active Routes Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Active Routes
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                  <Layers className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.routesCount}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  City Pairs
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Bogota, Medellin, Cali, Cartagena & more
              </p>
            </div>

            {/* Avg Economy Fare Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Avg Economy Base
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <DollarSign className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  ${formatCOP(stats.avgEco)}
                </span>
                <span className="text-[11px] font-bold text-slate-500">COP</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Configured base economy tariff
              </p>
            </div>

            {/* Avg Business Fare Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Avg Business Base
                </span>
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-900 dark:text-amber-300">
                  ${formatCOP(stats.avgBus)}
                </span>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">COP</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Premium front cabin tariff
              </p>
            </div>
          </div>

          {/* Search, Filter & Operations Bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Fast Search Input */}
              <div className="relative flex-1 max-w-xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by flight number (e.g. VY-1001), city (e.g. Medellin, Bogota), or airport code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-9 text-xs rounded-xl border-slate-300 bg-slate-50/70 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:focus:bg-slate-900"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Filter Selectors */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Route Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Filter className="size-3.5 text-slate-400" />
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs focus:border-[#E01E26] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="all">All Routes ({flights.length})</option>
                    {uniqueRoutes.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400" />
                  <select
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs focus:border-[#E01E26] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="all">All Dates</option>
                    {uniqueDates.map((date) => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="size-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as
                          | 'dep_asc'
                          | 'dep_desc'
                          | 'eco_asc'
                          | 'eco_desc'
                          | 'flight_asc'
                      )
                    }
                    className="h-10 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs focus:border-[#E01E26] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="dep_asc">Earliest Departure</option>
                    <option value="dep_desc">Latest Departure</option>
                    <option value="eco_asc">Lowest Economy Price</option>
                    <option value="eco_desc">Highest Economy Price</option>
                    <option value="flight_asc">Flight Number (A-Z)</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {(searchQuery || selectedRoute !== 'all' || selectedDateFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedRoute('all');
                      setSelectedDateFilter('all');
                    }}
                    className="h-10 text-xs font-bold text-[#E01E26] hover:bg-red-50 hover:text-[#C0181E] dark:hover:bg-red-950/40"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Results count bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <div>
                Showing <strong className="text-slate-800 dark:text-slate-200">{filteredFlights.length}</strong> of{' '}
                {flights.length} total scheduled domestic flights
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                <span>Real-Time Atomic Locking Enabled</span>
              </div>
            </div>
          </div>

          {/* Flights Table Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="size-10 animate-spin rounded-full border-4 border-[#E01E26] border-t-transparent" />
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Loading domestic flight operations data...
                </p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                  <AlertCircle className="size-6" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  Error Loading Flights Catalog
                </h3>
                <p className="mt-1 text-xs text-slate-500">{error}</p>
                <Button onClick={fetchFlights} size="sm" variant="outline" className="mt-4 text-xs">
                  Retry
                </Button>
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Search className="size-6" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  No flights match your search query or filters
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Try adjusting the flight number, city name, or clear the active route filters.
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRoute('all');
                    setSelectedDateFilter('all');
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs font-bold"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                  {/* Table Header */}
                  <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3.5">Flight / Aircraft</th>
                      <th className="px-4 py-3.5">Route</th>
                      <th className="px-4 py-3.5">Departure & Arrival Schedule</th>
                      <th className="px-4 py-3.5">Economy Fare (COP)</th>
                      <th className="px-4 py-3.5">Business Fare (COP)</th>
                      <th className="px-4 py-3.5 text-center">Seats Open</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredFlights.map((flight) => {
                      const isEditing = Boolean(editingRows[flight.id]);
                      const editState = editingRows[flight.id];
                      const isSaving = Boolean(savingFlightIds[flight.id]);
                      const isRecentlyUpdated = Boolean(recentlyUpdatedFlightIds[flight.id]);

                      return (
                        <tr
                          key={flight.id}
                          className={`transition-colors duration-200 ${
                            isRecentlyUpdated
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
                              : isEditing
                              ? 'bg-amber-50/40 dark:bg-amber-950/20'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Column 1: Flight Number & Aircraft */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-md bg-[#E01E26] px-2 py-0.5 font-mono text-xs font-black text-white shadow-xs">
                                  {flight.flight_number}
                                </span>
                                {isRecentlyUpdated && (
                                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 animate-pulse">
                                    <CheckCircle2 className="size-2.5" />
                                    <span>Updated</span>
                                  </span>
                                )}
                              </div>
                              <span className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {flight.aircraft_type}
                              </span>
                            </div>
                          </td>

                          {/* Column 2: Route */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                  <span className="font-mono text-xs font-black text-[#E01E26] dark:text-red-400">
                                    {flight.origin}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="font-mono text-xs font-black text-[#E01E26] dark:text-red-400">
                                    {flight.destination}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
                                  {flight.origin_city} to {flight.destination_city}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="hidden sm:inline-flex text-[10px] font-semibold text-slate-500 border-slate-200 dark:border-slate-700"
                              >
                                {flight.duration_minutes}m
                              </Badge>
                            </div>
                          </td>

                          {/* Column 3: Departure & Arrival Schedule */}
                          <td className="px-4 py-3.5 align-middle">
                            {isEditing && editState ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-slate-500">
                                  Edit Departure (Date & Time)
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editState.departure_at_local}
                                  onChange={(e) =>
                                    handleRowFieldChange(
                                      flight.id,
                                      'departure_at_local',
                                      e.target.value
                                    )
                                  }
                                  className="h-8 w-full min-w-[190px] rounded-lg border border-red-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-[#E01E26] focus:outline-none dark:border-red-800 dark:bg-slate-900 dark:text-white"
                                />
                                <span className="text-[10px] text-slate-500">
                                  Arrival recalculates automatically
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                  <Clock className="size-3 text-[#E01E26]" />
                                  <span>{formatFlightTime(flight.departure_at)}</span>
                                  <span className="text-slate-400">→</span>
                                  <span>{formatFlightTime(flight.arrival_at)}</span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  {formatFlightDate(flight.departure_at)}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Column 4: Economy Fare (COP) */}
                          <td className="px-4 py-3.5 align-middle">
                            {isEditing && editState ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-[#C0181E] dark:text-red-300">
                                  Economy Price (COP)
                                </label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-xs font-bold text-slate-400">$</span>
                                  <input
                                    type="number"
                                    min={50000}
                                    step={1000}
                                    value={editState.base_price_economy}
                                    onChange={(e) =>
                                      handleRowFieldChange(
                                        flight.id,
                                        'base_price_economy',
                                        Number(e.target.value)
                                      )
                                    }
                                    className="h-8 w-28 rounded-lg border border-red-300 bg-white pl-5 pr-2 text-xs font-black text-slate-900 focus:border-[#E01E26] focus:outline-none dark:border-red-800 dark:bg-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xs font-black text-slate-900 dark:text-white">
                                    ${formatCOP(flight.base_price_economy)}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">COP</span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                  {flight.economy_seats_remaining} seats open
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Column 5: Business Fare (COP) */}
                          <td className="px-4 py-3.5 align-middle">
                            {isEditing && editState ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                                  Business Price (COP)
                                </label>
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-xs font-bold text-slate-400">$</span>
                                  <input
                                    type="number"
                                    min={100000}
                                    step={5000}
                                    value={editState.base_price_business}
                                    onChange={(e) =>
                                      handleRowFieldChange(
                                        flight.id,
                                        'base_price_business',
                                        Number(e.target.value)
                                      )
                                    }
                                    className="h-8 w-28 rounded-lg border border-amber-300 bg-white pl-5 pr-2 text-xs font-black text-amber-950 focus:border-amber-500 focus:outline-none dark:border-amber-700 dark:bg-slate-900 dark:text-amber-300"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                                    ${formatCOP(flight.base_price_business)}
                                  </span>
                                  <span className="text-[10px] font-semibold text-amber-700/70 dark:text-amber-400/70">
                                    COP
                                  </span>
                                </div>
                                <span className="text-[10px] font-medium text-amber-800/80 dark:text-amber-400/80">
                                  {flight.business_seats_remaining} seats open
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Column 6: Open Seats Count */}
                          <td className="px-4 py-3.5 align-middle text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                flight.seats_remaining > 20
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : flight.seats_remaining > 0
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {flight.seats_remaining} open
                            </span>
                          </td>

                          {/* Column 7: Actions */}
                          <td className="px-4 py-3.5 align-middle text-right">
                            {isEditing && editState ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveFlight(flight.id, editState)}
                                  disabled={isSaving}
                                  className="h-8 rounded-lg bg-[#E01E26] px-3 text-xs font-black text-white hover:bg-[#C0181E] shadow-sm disabled:opacity-50"
                                >
                                  <Save className="size-3.5 mr-1" />
                                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelRowEdit(flight.id)}
                                  disabled={isSaving}
                                  className="h-8 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                >
                                  <X className="size-3.5 mr-1" />
                                  <span>Cancel</span>
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartRowEdit(flight)}
                                  className="h-8 rounded-lg border-slate-300 text-xs font-bold hover:border-red-300 hover:bg-red-50 hover:text-[#E01E26] dark:border-slate-700 dark:hover:border-red-800 dark:hover:bg-red-950/40"
                                >
                                  <Edit2 className="size-3 mr-1 text-[#E01E26]" />
                                  <span>Edit</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditModal(flight)}
                                  title="Open in modal dialog"
                                  className="h-8 px-2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                >
                                  <SlidersHorizontal className="size-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal Dialog */}
      {modalFlight && modalEditState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#E01E26] px-2.5 py-1 font-mono text-xs font-black text-white">
                  {modalFlight.flight_number}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit Flight Operations
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalFlight(null);
                  setModalEditState(null);
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="p-6 space-y-5">
              {/* Route Summary */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Sector Route</div>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {modalFlight.origin_city} ({modalFlight.origin}) → {modalFlight.destination_city} ({modalFlight.destination})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Aircraft</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {modalFlight.aircraft_type}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Departure Datetime */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Departure Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={modalEditState.departure_at_local}
                    onChange={(e) =>
                      setModalEditState((prev) =>
                        prev ? { ...prev, departure_at_local: e.target.value } : null
                      )
                    }
                    className="h-11 font-bold text-xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Arrival time will automatically adjust according to the {modalFlight.duration_minutes}-minute flight plan.
                  </p>
                </div>

                {/* Price Fields Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Economy Price */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-[#C0181E] dark:text-red-400 mb-1.5">
                      Economy Base Price (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        $
                      </span>
                      <Input
                        type="number"
                        min={50000}
                        step={1000}
                        value={modalEditState.base_price_economy}
                        onChange={(e) =>
                          setModalEditState((prev) =>
                            prev
                              ? { ...prev, base_price_economy: Number(e.target.value) }
                              : null
                          )
                        }
                        className="h-11 pl-7 font-black text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Business Price */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1.5">
                      Business Base Price (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        $
                      </span>
                      <Input
                        type="number"
                        min={100000}
                        step={5000}
                        value={modalEditState.base_price_business}
                        onChange={(e) =>
                          setModalEditState((prev) =>
                            prev
                              ? { ...prev, base_price_business: Number(e.target.value) }
                              : null
                          )
                        }
                        className="h-11 pl-7 font-black text-amber-950 dark:text-amber-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/80">
              <Button
                variant="outline"
                onClick={() => {
                  setModalFlight(null);
                  setModalEditState(null);
                }}
                disabled={isModalSaving}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (modalFlight && modalEditState) {
                    setIsModalSaving(true);
                    await handleSaveFlight(modalFlight.id, modalEditState);
                  }
                }}
                disabled={isModalSaving}
                className="rounded-xl bg-[#E01E26] px-5 text-xs font-black text-white hover:bg-[#C0181E] shadow-sm disabled:opacity-50"
              >
                <Save className="size-3.5 mr-1.5" />
                <span>{isModalSaving ? 'Saving Changes...' : 'Save Flight Changes'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-xl border animate-in slide-in-from-bottom-5 duration-200 ${
                toast.type === 'success'
                  ? 'border-emerald-300 bg-emerald-950 text-white dark:border-emerald-700'
                  : toast.type === 'error'
                  ? 'border-rose-400 bg-rose-950 text-white dark:border-rose-700'
                  : 'border-slate-300 bg-slate-900 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="size-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="size-5 text-sky-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="text-xs font-black">{toast.title}</h4>
                <p className="mt-0.5 text-[11px] text-slate-200 leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
