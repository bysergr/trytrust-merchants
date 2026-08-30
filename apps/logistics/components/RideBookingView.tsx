'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { MapSimulator } from './MapSimulator';
import { VehicleCard } from './VehicleCard';
import { QuoteResult, ServiceRequest, VehicleType } from '@/lib/types';

interface RideBookingViewProps {
  onSuccess: (request: ServiceRequest) => void;
}

const PRESET_ROUTES = [
  { label: 'Downtown to Pier 39', pickup: 'Market St & 4th St, San Francisco, CA', dropoff: 'Pier 39, Fisherman\'s Wharf, SF' },
  { label: 'Financial District to SFO Airport', pickup: '100 Montgomery St, Financial District, SF', dropoff: 'SFO International Airport, Terminal 2' },
  { label: 'Mission District to Golden Gate', pickup: 'Valencia St & 18th St, Mission, SF', dropoff: 'Golden Gate Bridge Welcome Center, SF' },
];

export function RideBookingView({ onSuccess }: RideBookingViewProps) {
  const [pickup, setPickup] = useState('Market St & 4th St, San Francisco, CA');
  const [dropoff, setDropoff] = useState('Pier 39, Fisherman\'s Wharf, SF');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('ride-economy');

  const [vehicles, setVehicles] = useState<Array<VehicleType & { count_available: number }>>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load ride vehicle types
  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoadingVehicles(true);
        const res = await fetch('/api/vehicles?service=ride');
        const data = await res.json();
        if (data.vehicles) {
          setVehicles(data.vehicles);
          setSelectedVehicleId((prev) => prev || data.vehicles[0]?.id || 'ride-economy');
        }
      } catch (err) {
        console.error('Error fetching ride vehicles', err);
      } finally {
        setLoadingVehicles(false);
      }
    }
    loadVehicles();
  }, []);

  // Fetch upfront quotes whenever pickup or dropoff changes
  useEffect(() => {
    if (!pickup.trim() || !dropoff.trim() || vehicles.length === 0) return;

    let isMounted = true;
    async function fetchQuotes() {
      setLoadingQuote(true);
      setErrorMessage(null);
      const newQuotes: Record<string, QuoteResult> = {};

      try {
        await Promise.all(
          vehicles.map(async (v) => {
            const res = await fetch('/api/quote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service: 'ride',
                vehicle_type_id: v.id,
                pickup_address: pickup,
                dropoff_address: dropoff,
                scheduled_at: scheduledAt || null,
              }),
            });
            const data = await res.json();
            if (data.quote) {
              newQuotes[v.id] = data.quote;
            }
          })
        );
        if (isMounted) {
          setQuotes(newQuotes);
        }
      } catch (err) {
        console.error('Failed to calculate quotes', err);
      } finally {
        if (isMounted) setLoadingQuote(false);
      }
    }

    const timer = setTimeout(fetchQuotes, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pickup, dropoff, scheduledAt, vehicles]);

  // Handle ride request submission
  async function handleSubmitRide(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicleId) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/requests/ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_type_id: selectedVehicleId,
          pickup_address: pickup,
          dropoff_address: dropoff,
          scheduled_at: scheduledAt || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to match ride request');
      }

      onSuccess(data.request);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating ride request');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedQuote = quotes[selectedVehicleId];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-4rem)]">
      {/* Left Column: Booking Drawer / Form (5 cols on lg) */}
      <div className="lg:col-span-5 bg-black border-r border-neutral-800 p-4 sm:p-6 lg:p-8 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-full">
              Uber Passenger Mobility
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
              Request a Ride
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Select pickup, destination, and ride tier with live guaranteed price matching.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="mb-5">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Popular Destinations
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ROUTES.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPickup(p.pickup);
                    setDropoff(p.dropoff);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmitRide} className="space-y-4">
            {/* Pickup & Dropoff Inputs with Route Line */}
            <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
              {/* Pickup */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    required
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="Enter pickup address"
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Separator Divider with Dot Connector */}
              <div className="border-t border-neutral-800 ml-9" />

              {/* Dropoff */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-600 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Destination
                  </label>
                  <input
                    type="text"
                    required
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    placeholder="Where to?"
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Optional Schedule Pickup */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Schedule for later (Optional)</span>
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Vehicle Tier Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Select Ride Option
                </h3>
                {loadingQuote && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Updating quotes...
                  </span>
                )}
              </div>

              {loadingVehicles ? (
                <div className="py-8 text-center text-neutral-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                  Loading available vehicles...
                </div>
              ) : (
                <div className="space-y-2.5">
                  {vehicles.map((v) => (
                    <VehicleCard
                      key={v.id}
                      vehicle={v}
                      isSelected={selectedVehicleId === v.id}
                      onSelect={(id) => setSelectedVehicleId(id)}
                      calculatedPrice={quotes[v.id]?.total_price}
                      etaMinutes={quotes[v.id]?.duration_minutes}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Matching Error: </strong>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Quote Summary breakdown */}
            {selectedQuote && (
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1.5 text-xs text-neutral-300">
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-400">Estimated distance:</span>
                  <span className="text-white">{selectedQuote.distance_km} km</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-400">Estimated trip duration:</span>
                  <span className="text-white">{selectedQuote.duration_minutes} minutes</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-neutral-400">Base fare:</span>
                  <span className="text-white">${selectedQuote.base_fare.toFixed(2)}</span>
                </div>
                <div className="border-t border-neutral-800 pt-1.5 flex justify-between font-bold text-sm text-white">
                  <span>Total Fare:</span>
                  <span className="text-emerald-400 font-black text-base">
                    ${selectedQuote.total_price.toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}

            {/* Confirm & Request Button */}
            <button
              type="submit"
              disabled={submitting || loadingVehicles || !selectedVehicleId}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base tracking-tight shadow-xl hover:shadow-[0_0_25px_rgba(6,193,103,0.35)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Matching Nearby Driver...
                </>
              ) : (
                <>
                  Confirm {selectedQuote?.vehicle_type.name || 'Ride'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Live Map Simulator (7 cols on lg) */}
      <div className="lg:col-span-7 h-full min-h-[400px] lg:min-h-full">
        <MapSimulator
          service="ride"
          pickupAddress={pickup}
          dropoffAddress={dropoff}
          etaMinutes={selectedQuote?.duration_minutes || 6}
        />
      </div>
    </div>
  );
}
