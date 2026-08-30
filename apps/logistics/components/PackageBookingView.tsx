'use client';

import React, { useState, useEffect } from 'react';
import { Weight, Calendar, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { MapSimulator } from './MapSimulator';
import { VehicleCard } from './VehicleCard';
import { QuoteResult, ServiceRequest, VehicleType } from '@/lib/types';

interface PackageBookingViewProps {
  onSuccess: (request: ServiceRequest) => void;
}

const PRESET_PACKAGE_ROUTES = [
  {
    label: 'Documents: Financial District to Mission Bay',
    pickup: '100 Montgomery St, Financial District, SF',
    dropoff: '550 16th St, Mission Bay, SF',
    desc: 'Confidential corporate contracts and notary stamp envelope',
    weight: 1.5,
  },
  {
    label: 'Retail: Union Square to Presidio',
    pickup: '333 Post St, Union Square, SF',
    dropoff: '215 Lincoln Blvd, Presidio, SF',
    desc: 'Luxury boutique apparel boxes and retail merchandise',
    weight: 8.0,
  },
];

export function PackageBookingView({ onSuccess }: PackageBookingViewProps) {
  const [pickup, setPickup] = useState('100 Montgomery St, Financial District, SF');
  const [dropoff, setDropoff] = useState('550 16th St, Mission Bay, SF');
  const [description, setDescription] = useState('Urgent legal documents and parcel pouch');
  const [weightKg, setWeightKg] = useState<number>(2.5);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('pkg-motorcycle');

  const [vehicles, setVehicles] = useState<Array<VehicleType & { count_available: number }>>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load package vehicle types
  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoadingVehicles(true);
        const res = await fetch('/api/vehicles?service=package');
        const data = await res.json();
        if (data.vehicles) {
          setVehicles(data.vehicles);
          setSelectedVehicleId((prev) => prev || data.vehicles[0]?.id || 'pkg-motorcycle');
        }
      } catch (err) {
        console.error('Error fetching package vehicles', err);
      } finally {
        setLoadingVehicles(false);
      }
    }
    loadVehicles();
  }, []);

  // Fetch upfront quotes whenever inputs change
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
                service: 'package',
                vehicle_type_id: v.id,
                pickup_address: pickup,
                dropoff_address: dropoff,
                package_weight_kg: Number(weightKg) || 1,
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
        console.error('Failed to calculate package quotes', err);
      } finally {
        if (isMounted) setLoadingQuote(false);
      }
    }

    const timer = setTimeout(fetchQuotes, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pickup, dropoff, weightKg, scheduledAt, vehicles]);

  // Handle package delivery submission
  async function handleSubmitPackage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicleId) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/requests/package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_type_id: selectedVehicleId,
          pickup_address: pickup,
          dropoff_address: dropoff,
          package_description: description,
          package_weight_kg: Number(weightKg),
          scheduled_at: scheduledAt || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch package delivery');
      }

      onSuccess(data.request);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating package request');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedQuote = quotes[selectedVehicleId];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-4rem)]">
      {/* Left Column: Booking Form (5 cols on lg) */}
      <div className="lg:col-span-5 bg-black border-r border-neutral-800 p-4 sm:p-6 lg:p-8 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-full">
              Uber Connect Courier
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
              Send a Package
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              On-demand door-to-door courier dispatch with real-time tracking and delivery confirmation.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="mb-5">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Quick Delivery Templates
            </div>
            <div className="flex flex-col gap-1.5">
              {PRESET_PACKAGE_ROUTES.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPickup(p.pickup);
                    setDropoff(p.dropoff);
                    setDescription(p.desc);
                    setWeightKg(p.weight);
                  }}
                  className="text-left px-3 py-1.5 rounded-lg text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors"
                >
                  <span className="font-semibold text-emerald-400">{p.label}</span> ({p.weight} kg)
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmitPackage} className="space-y-4">
            {/* Pickup & Dropoff Inputs */}
            <div className="relative bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Sender Pickup Address
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

              <div className="border-t border-neutral-800 ml-9" />

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-600 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Recipient Dropoff Address
                  </label>
                  <input
                    type="text"
                    required
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    placeholder="Enter recipient destination"
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Package Details (Description & Weight) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Package Contents
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Legal documents, box, gift"
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Weight (kg)
                </label>
                <div className="flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="number"
                    required
                    min={0.1}
                    max={150}
                    step={0.1}
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Option */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Schedule Pickup Time</span>
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Courier Vehicle Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Select Courier Vehicle
                </h3>
                {loadingQuote && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Updating rates...
                  </span>
                )}
              </div>

              {loadingVehicles ? (
                <div className="py-6 text-center text-neutral-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                  Loading courier fleet...
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
                  <strong className="font-bold">Courier Dispatch Error: </strong>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Price breakdown */}
            {selectedQuote && (
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 space-y-1.5 text-xs text-neutral-300">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Courier distance:</span>
                  <span className="text-white">{selectedQuote.distance_km} km</span>
                </div>
                {selectedQuote.weight_surcharge > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Heavy parcel surcharge ({weightKg}kg):</span>
                    <span>+${selectedQuote.weight_surcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-neutral-800 pt-1.5 flex justify-between font-bold text-sm text-white">
                  <span>Delivery Cost:</span>
                  <span className="text-emerald-400 font-black text-base">
                    ${selectedQuote.total_price.toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loadingVehicles || !selectedVehicleId}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base tracking-tight shadow-xl hover:shadow-[0_0_25px_rgba(6,193,103,0.35)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Dispatching Courier...
                </>
              ) : (
                <>
                  Dispatch {selectedQuote?.vehicle_type.name || 'Courier'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Live Map Simulator */}
      <div className="lg:col-span-7 h-full min-h-[400px] lg:min-h-full">
        <MapSimulator
          service="package"
          pickupAddress={pickup}
          dropoffAddress={dropoff}
          etaMinutes={selectedQuote?.duration_minutes || 8}
        />
      </div>
    </div>
  );
}
