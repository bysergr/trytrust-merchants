'use client';

import React, { useState, useEffect } from 'react';
import { Weight, Calendar, ArrowRight, Loader2, AlertCircle, Sparkles, ArrowUpDown } from 'lucide-react';
import { MapSimulator } from './MapSimulator';
import { VehicleCard, formatCopCurrency } from './VehicleCard';
import { QuoteResult, ServiceRequest, VehicleType } from '@/lib/types';
import { estimateClientCoordinates } from '@/lib/client-geo';

interface FreightBookingViewProps {
  onSuccess: (request: ServiceRequest) => void;
}

const BOGOTA_PRESET_FREIGHT = [
  {
    label: 'Zona Franca Fontibón to Parque Industrial Siberia',
    pickup: 'Zona Franca Fontibón, Calle 13 # 106-95, Bogotá',
    dropoff: 'Parque Industrial Siberia, Vía Cota - Bogotá',
    desc: '3 estibas con equipos de refrigeración industrial y maquinaria',
    weight: 2200,
  },
  {
    label: 'Corferias to Centro Empresarial Calle 100',
    pickup: 'Centro de Convenciones Corferias, Bogotá',
    dropoff: 'Calle 100 con Carrera 15, Bogotá',
    desc: 'Estructuras modulares de exhibición y stands feriales',
    weight: 1400,
  },
  {
    label: 'Cota to Funza Hub Logístico',
    pickup: 'Parque Industrial Cota, Cundinamarca',
    dropoff: 'Centro de Distribución Funza, Cundinamarca',
    desc: '8 estibas estándar con materiales de construcción y ferretería',
    weight: 4800,
  },
];

export function FreightBookingView({ onSuccess }: FreightBookingViewProps) {
  const [pickup, setPickup] = useState('Zona Franca Fontibón, Calle 13 # 106-95, Bogotá');
  const [dropoff, setDropoff] = useState('Parque Industrial Siberia, Vía Cota - Bogotá');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 4.6825, lng: -74.1534 });
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number }>({ lat: 4.7431, lng: -74.1542 });
  const [cargoDescription, setCargoDescription] = useState('3 estibas con equipos de refrigeración industrial');
  const [weightKg, setWeightKg] = useState<number>(1850);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('freight-box-truck');

  const [vehicles, setVehicles] = useState<Array<VehicleType & { count_available: number }>>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load freight vehicle types
  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoadingVehicles(true);
        const res = await fetch('/api/vehicles?service=freight');
        const data = await res.json();
        if (data.vehicles) {
          setVehicles(data.vehicles);
          setSelectedVehicleId((prev) => prev || data.vehicles[0]?.id || 'freight-box-truck');
        }
      } catch (err) {
        console.error('Error fetching freight vehicles', err);
      } finally {
        setLoadingVehicles(false);
      }
    }
    loadVehicles();
  }, []);

  const handlePickupChange = (val: string) => {
    setPickup(val);
    setPickupCoords(estimateClientCoordinates(val));
  };

  const handleDropoffChange = (val: string) => {
    setDropoff(val);
    setDropoffCoords(estimateClientCoordinates(val));
  };

  const handleSwapAddresses = () => {
    const tempP = pickup;
    const tempCoordsP = pickupCoords;
    setPickup(dropoff);
    setPickupCoords(dropoffCoords);
    setDropoff(tempP);
    setDropoffCoords(tempCoordsP);
  };

  const handleMapClick = (type: 'pickup' | 'dropoff', coords: { lat: number; lng: number }, address: string) => {
    if (type === 'pickup') {
      setPickup(address);
      setPickupCoords(coords);
    } else {
      setDropoff(address);
      setDropoffCoords(coords);
    }
  };

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
                service: 'freight',
                vehicle_type_id: v.id,
                pickup_address: pickup,
                dropoff_address: dropoff,
                pickup_lat: pickupCoords.lat,
                pickup_lng: pickupCoords.lng,
                dropoff_lat: dropoffCoords.lat,
                dropoff_lng: dropoffCoords.lng,
                cargo_weight_kg: Number(weightKg) || 100,
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
        console.error('Failed to calculate freight quotes', err);
      } finally {
        if (isMounted) setLoadingQuote(false);
      }
    }

    const timer = setTimeout(fetchQuotes, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pickup, dropoff, pickupCoords, dropoffCoords, weightKg, scheduledAt, vehicles]);

  // Handle freight booking submission
  async function handleSubmitFreight(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicleId) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/requests/freight', {
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
          cargo_description: cargoDescription,
          cargo_weight_kg: Number(weightKg),
          scheduled_at: scheduledAt || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule freight carrier');
      }

      onSuccess(data.request);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating freight request');
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
          <div className="mb-5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
              Logistics Carga & Fletes Bogotá
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
              Move Custom Cargo
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              Type custom warehouse addresses or click directly on the Bogotá map to schedule freight.
            </p>
          </div>

          <form onSubmit={handleSubmitFreight} className="space-y-4">
            {/* Pickup & Dropoff Origin/Destination with Swap */}
            <div className="relative bg-neutral-950 border border-neutral-800 rounded-3xl p-4 space-y-3 shadow-2xl">
              <button
                type="button"
                onClick={handleSwapAddresses}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-700 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-all shadow-md"
                title="Swap origin and destination"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 pr-10">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    Custom Loading Warehouse (Origen)
                  </label>
                  <input
                    type="text"
                    required
                    value={pickup}
                    onChange={(e) => handlePickupChange(e.target.value)}
                    placeholder="Enter custom pickup warehouse in Bogotá..."
                    className="w-full bg-transparent text-sm font-bold text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-neutral-800 ml-9" />

              <div className="flex items-center gap-3.5 pr-10">
                <div className="w-6 h-6 rounded-lg bg-white border border-neutral-400 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-black rounded-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                    Custom Destination Facility (Destino)
                  </label>
                  <input
                    type="text"
                    required
                    value={dropoff}
                    onChange={(e) => handleDropoffChange(e.target.value)}
                    placeholder="Enter custom destination facility..."
                    className="w-full bg-transparent text-sm font-bold text-white placeholder-neutral-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Standard Freight Corridors
              </div>
              <div className="flex flex-col gap-1.5">
                {BOGOTA_PRESET_FREIGHT.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      handlePickupChange(p.pickup);
                      handleDropoffChange(p.dropoff);
                      setCargoDescription(p.desc);
                      setWeightKg(p.weight);
                    }}
                    className="text-left px-3 py-2 rounded-xl text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors"
                  >
                    <span className="font-bold text-emerald-400">{p.label}</span>
                    <span className="text-neutral-400 text-[11px] block">{p.desc} ({p.weight} kg)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cargo Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-1">
                  Cargo Manifest (Manifiesto de Carga)
                </label>
                <input
                  type="text"
                  required
                  value={cargoDescription}
                  onChange={(e) => setCargoDescription(e.target.value)}
                  placeholder="e.g. 4 estibas maquinaria, insumos industriales"
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
                <label className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-1">
                  Weight (kg)
                </label>
                <div className="flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-emerald-400" />
                  <input
                    type="number"
                    required
                    min={10}
                    max={25000}
                    step={10}
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-xs sm:text-sm font-black text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Option */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Scheduled Freight Dispatch</span>
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Freight Vehicle Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">
                  Select Carrier Vehicle Class
                </h3>
                {loadingQuote && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calculating truck rates...
                  </span>
                )}
              </div>

              {loadingVehicles ? (
                <div className="py-6 text-center text-neutral-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                  Loading commercial freight carriers...
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
                  <strong className="font-bold">Freight Carrier Error: </strong>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Price breakdown */}
            {selectedQuote && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-2 text-xs text-neutral-300 shadow-xl">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Haulage distance:</span>
                  <span className="text-white font-bold">{selectedQuote.distance_km} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Base truck rate:</span>
                  <span className="text-white font-mono">{formatCopCurrency(selectedQuote.base_fare)}</span>
                </div>
                {selectedQuote.weight_surcharge > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Heavy freight payload fee ({weightKg}kg):</span>
                    <span>+{formatCopCurrency(selectedQuote.weight_surcharge)}</span>
                  </div>
                )}
                <div className="border-t border-neutral-800 pt-2 flex justify-between font-black text-sm text-white">
                  <span>Guaranteed Freight Quote:</span>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loadingVehicles || !selectedVehicleId}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-base tracking-tight shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                  Booking Commercial Carrier...
                </>
              ) : (
                <>
                  Schedule {selectedQuote?.vehicle_type.name || 'Carrier'}
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
          service="freight"
          pickupAddress={pickup}
          dropoffAddress={dropoff}
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          etaMinutes={selectedQuote?.duration_minutes || 18}
          onMapClickLocation={handleMapClick}
        />
      </div>
    </div>
  );
}
