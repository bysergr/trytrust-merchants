'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Loader2, AlertCircle, Sparkles, ArrowUpDown } from 'lucide-react';
import { MapSimulator } from './MapSimulator';
import { VehicleCard, formatCopCurrency } from './VehicleCard';
import { QuoteResult, ServiceRequest, VehicleType } from '@/lib/types';
import { estimateClientCoordinates } from '@/lib/client-geo';

interface RideBookingViewProps {
  onSuccess: (request: ServiceRequest) => void;
}

const BOGOTA_QUICK_SUGGESTIONS = [
  { address: 'Parque de la 93, Chicó, Bogotá', label: 'Parque de la 93', tag: 'Chicó' },
  { address: 'Aeropuerto Internacional El Dorado, Terminal 1', label: 'Aeropuerto El Dorado', tag: 'Airport' },
  { address: 'Torre Colpatria, Centro Internacional, Bogotá', label: 'Torre Colpatria', tag: 'Centro' },
  { address: 'Zona T, Calle 82 # 12-35, Bogotá', label: 'Zona T / Andino', tag: 'Zona Rosa' },
  { address: 'Unicentro Bogotá, Avenida 15 # 124-30', label: 'Unicentro Bogotá', tag: 'Usaquén' },
  { address: 'Calle 140 # 11-45, Cedritos, Bogotá', label: 'Cedritos (Calle 140)', tag: 'Norte' },
  { address: 'Calle 72 con Carrera 7, Bogotá', label: 'Distrito Financiero (Cl 72)', tag: 'Financiero' },
  { address: 'Corferias Bogotá, Carrera 37 # 24-67', label: 'Corferias', tag: 'Salitre' },
];

export function RideBookingView({ onSuccess }: RideBookingViewProps) {
  const [pickup, setPickup] = useState('Parque de la 93, Chicó, Bogotá');
  const [dropoff, setDropoff] = useState('Aeropuerto Internacional El Dorado, Terminal 1');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 4.6768, lng: -74.0536 });
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number }>({ lat: 4.7016, lng: -74.1469 });
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('ride-economy');

  const [activeInputFocus, setActiveInputFocus] = useState<'pickup' | 'dropoff' | null>(null);
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

  // Update estimated coordinates when typing addresses
  const handlePickupChange = (val: string) => {
    setPickup(val);
    const estimated = estimateClientCoordinates(val);
    setPickupCoords(estimated);
  };

  const handleDropoffChange = (val: string) => {
    setDropoff(val);
    const estimated = estimateClientCoordinates(val);
    setDropoffCoords(estimated);
  };

  // Swap pickup & dropoff
  const handleSwapAddresses = () => {
    const tempP = pickup;
    const tempCoordsP = pickupCoords;
    setPickup(dropoff);
    setPickupCoords(dropoffCoords);
    setDropoff(tempP);
    setDropoffCoords(tempCoordsP);
  };

  // Handle map click to set custom location
  const handleMapClick = (type: 'pickup' | 'dropoff', coords: { lat: number; lng: number }, address: string) => {
    if (type === 'pickup') {
      setPickup(address);
      setPickupCoords(coords);
    } else {
      setDropoff(address);
      setDropoffCoords(coords);
    }
  };

  // Fetch upfront quotes whenever addresses or coordinates change
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
                pickup_lat: pickupCoords.lat,
                pickup_lng: pickupCoords.lng,
                dropoff_lat: dropoffCoords.lat,
                dropoff_lng: dropoffCoords.lng,
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

    const timer = setTimeout(fetchQuotes, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pickup, dropoff, pickupCoords, dropoffCoords, scheduledAt, vehicles]);

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
          pickup_lat: pickupCoords.lat,
          pickup_lng: pickupCoords.lng,
          dropoff_lat: dropoffCoords.lat,
          dropoff_lng: dropoffCoords.lng,
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
      {/* Left Column: Booking Drawer (5 cols on lg) */}
      <div className="lg:col-span-5 bg-black border-r border-neutral-800 p-4 sm:p-6 lg:p-8 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="mb-5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
              Bogotá Passenger Mobility
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
              Request a Custom Ride
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Type any custom address, pick from live suggestions, or click directly on the map.
            </p>
          </div>

          <form onSubmit={handleSubmitRide} className="space-y-4">
            {/* Custom Pickup & Dropoff Inputs with Route Line & Swap Button */}
            <div className="relative bg-neutral-950 border border-neutral-800 rounded-3xl p-4 space-y-3 shadow-2xl">
              {/* Swap Button */}
              <button
                type="button"
                onClick={handleSwapAddresses}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-700 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-all shadow-md"
                title="Swap pickup and destination"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              {/* Pickup Input */}
              <div className="flex items-center gap-3.5 pr-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    Custom Pickup (Punto de Partida)
                  </label>
                  <input
                    type="text"
                    required
                    value={pickup}
                    onFocus={() => setActiveInputFocus('pickup')}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    placeholder="Type any custom street, carrera, or landmark..."
                    className="w-full bg-transparent text-sm font-bold text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-neutral-800 ml-9" />

              {/* Dropoff Input */}
              <div className="flex items-center gap-3.5 pr-10">
                <div className="w-6 h-6 rounded-lg bg-white border border-neutral-400 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-black rounded-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    Custom Destination (Destino)
                  </label>
                  <input
                    type="text"
                    required
                    value={dropoff}
                    onFocus={() => setActiveInputFocus('dropoff')}
                    onChange={(e) => handleDropoffChange(e.target.value)}
                    placeholder="Where to in Bogotá? Type any address..."
                    className="w-full bg-transparent text-sm font-bold text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Suggestions & Chips */}
            <div>
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Bogotá Suggestions & Corridors
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {BOGOTA_QUICK_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (activeInputFocus === 'dropoff') {
                        handleDropoffChange(item.address);
                      } else {
                        handlePickupChange(item.address);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors flex items-center gap-1.5"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">({item.tag})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Option */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Schedule Ride (Programar Viaje)</span>
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Vehicle Tier Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">
                  Select Bogotá Vehicle Tier
                </h3>
                {loadingQuote && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calculating COP fares...
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
              <div className="p-4 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Dispatch Error: </strong>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Price breakdown */}
            {selectedQuote && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2 text-xs text-neutral-300 shadow-xl">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Calculated route:</span>
                  <span className="text-white font-bold">{selectedQuote.distance_km} km ({selectedQuote.duration_minutes} mins)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Base fare:</span>
                  <span className="text-white font-mono">{formatCopCurrency(selectedQuote.base_fare)}</span>
                </div>
                <div className="border-t border-neutral-800 pt-2 flex justify-between font-black text-sm text-white">
                  <span>Guaranteed Price:</span>
                  <div className="text-right">
                    <span className="text-emerald-400 font-black text-lg block">
                      {formatCopCurrency(selectedQuote.total_price)}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      ~${(selectedQuote.total_price / 4000).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm & Request Button */}
            <button
              type="submit"
              disabled={submitting || loadingVehicles || !selectedVehicleId}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base tracking-tight shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                  Matching Nearby Bogotá Driver...
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

      {/* Right Column: Live Map Simulator with Interactive Click-to-Pin */}
      <div className="lg:col-span-7 h-full min-h-[400px] lg:min-h-full">
        <MapSimulator
          service="ride"
          pickupAddress={pickup}
          dropoffAddress={dropoff}
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          etaMinutes={selectedQuote?.duration_minutes || 6}
          onMapClickLocation={handleMapClick}
        />
      </div>
    </div>
  );
}
