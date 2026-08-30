'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  Star,
  CreditCard,
  XCircle,
  Play,
  Loader2,
  AlertCircle,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { MapSimulator } from './MapSimulator';
import { formatCopCurrency } from './VehicleCard';
import { RequestStatus, ServiceRequest } from '@/lib/types';

interface TrackingViewProps {
  requestId: string;
  onBackToBooking: () => void;
  onStatusChange?: (updated: ServiceRequest) => void;
}

const STATUS_STEPS: Array<{ key: RequestStatus; label: string; desc: string }> = [
  { key: 'matched', label: 'Driver Matched', desc: 'Heading to pickup location' },
  { key: 'en_route', label: 'En Route (En Camino)', desc: 'Trip in progress towards destination' },
  { key: 'completed', label: 'Arrived (Llegada)', desc: 'Safely arrived at destination' },
];

export function TrackingView({ requestId, onBackToBooking, onStatusChange }: TrackingViewProps) {
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Poll request details
  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}`);
      const data = await res.json();
      if (data.request) {
        setRequest(data.request);
        if (onStatusChange) onStatusChange(data.request);
      }
    } catch (err) {
      console.error('Error fetching request', err);
    } finally {
      setLoading(false);
    }
  }, [requestId, onStatusChange]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/requests/${requestId}`);
        const data = await res.json();
        if (!ignore && data.request) {
          setRequest(data.request);
          if (onStatusChange) onStatusChange(data.request);
        }
      } catch (err) {
        console.error('Error fetching request', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    const interval = setInterval(fetchRequest, 3000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [requestId, fetchRequest, onStatusChange]);

  // Cancel handler
  const handleCancel = async () => {
    if (!request || request.status === 'completed' || request.status === 'cancelled') return;
    if (!confirm('Are you sure you want to cancel this request? The allocated Bogotá vehicle will be returned to the fleet pool.')) {
      return;
    }

    setCancelling(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel request');
      setRequest(data.request);
      if (onStatusChange) onStatusChange(data.request);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error cancelling request');
    } finally {
      setCancelling(false);
    }
  };

  // Payment handler
  const handlePay = async () => {
    if (!request || request.payment_status === 'paid') return;

    setPaying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_confirmation: `TXN-PSE-BOG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process payment');
      setRequest(data.request);
      if (onStatusChange) onStatusChange(data.request);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment error');
    } finally {
      setPaying(false);
    }
  };

  // Simulate advancing status
  const handleAdvanceStatus = async (nextStatus: RequestStatus) => {
    if (!request) return;
    setAdvancing(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/requests/${request.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance status');
      setRequest(data.request);
      if (onStatusChange) onStatusChange(data.request);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error advancing status');
    } finally {
      setAdvancing(false);
    }
  };

  const copyRequestId = () => {
    if (!request) return;
    navigator.clipboard.writeText(request.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !request) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-bold text-sm">Connecting to live Bogotá vehicle telemetry...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 text-center text-neutral-400">
        <p>Request not found.</p>
        <button
          onClick={onBackToBooking}
          className="mt-4 px-4 py-2 bg-neutral-800 text-white rounded-xl text-xs font-bold"
        >
          Return to Booking
        </button>
      </div>
    );
  }

  const isCancelled = request.status === 'cancelled';
  const isCompleted = request.status === 'completed';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === request.status);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-4rem)]">
      {/* Left Column: Tracking Bottom Sheet (5 cols on lg) */}
      <div className="lg:col-span-5 bg-black border-r border-neutral-800 p-4 sm:p-6 lg:p-8 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Header & Status Banner */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={onBackToBooking}
                className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                ← Book Another Trip in Bogotá
              </button>

              <button
                onClick={copyRequestId}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 hover:text-white"
                title="Copy Request ID"
              >
                <Share2 className="w-3 h-3 text-emerald-400" />
                {copied ? 'Copied!' : request.id}
              </button>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  LOGISTICS {request.service.toUpperCase()} BOGOTÁ
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1.5">
                  {isCancelled
                    ? 'Request Cancelled'
                    : isCompleted
                    ? 'Arrived at Destination'
                    : 'Driver is on the way'}
                </h2>
              </div>

              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {formatCopCurrency(request.price)}
                </div>
                <div className="text-[11px] text-neutral-400 font-medium">
                  {request.payment_status === 'paid' ? 'Paid (PSE / Tarjeta)' : 'Fare Due'}
                </div>
              </div>
            </div>
          </div>

          {/* Stepper (Matched -> En Route -> Arrived) */}
          {!isCancelled ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = request.status === step.key;

                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative text-center">
                      {/* Line connector */}
                      {idx > 0 && (
                        <div
                          className={`absolute top-4 -left-1/2 w-full h-[2.5px] -z-0 ${
                            isDone ? 'bg-emerald-500' : 'bg-neutral-800'
                          }`}
                        />
                      )}

                      {/* Circle icon */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black z-10 transition-all ${
                          isDone
                            ? 'bg-emerald-500 text-black ring-4 ring-emerald-500/20'
                            : 'bg-neutral-900 border border-neutral-700 text-neutral-500'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>

                      <div className="mt-2.5">
                        <span
                          className={`text-xs font-extrabold block ${
                            isCurrent ? 'text-white' : isDone ? 'text-neutral-300' : 'text-neutral-600'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Detail */}
              <div className="bg-neutral-900/90 rounded-2xl p-3.5 flex items-center justify-between text-xs border border-neutral-800">
                <div className="flex items-center gap-2 text-neutral-300 font-medium">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isCompleted
                      ? 'Trip completed successfully'
                      : `ETA: ${new Date(request.estimated_arrival_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
                <span className="text-neutral-400 font-mono text-[11px] font-bold">
                  {request.distance_km} km total
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-red-950/50 border border-red-800 rounded-3xl p-5 text-red-200 text-xs flex items-center gap-3.5">
              <XCircle className="w-7 h-7 text-red-400 flex-shrink-0" />
              <div>
                <div className="font-extrabold text-sm text-red-300">This request was cancelled</div>
                <div>The assigned vehicle in Bogotá has been released back into the fleet pool.</div>
              </div>
            </div>
          )}

          {/* Assigned Driver / Courier / Carrier Card */}
          {request.driver_name && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center font-black text-emerald-400 text-lg">
                  {request.driver_name[0]}
                </div>
                <div>
                  <h4 className="font-black text-white text-base tracking-tight">
                    {request.driver_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-400">
                    <span className="flex items-center gap-1 text-amber-400 font-extrabold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {request.driver_rating}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-200 font-mono font-bold">{request.driver_plate}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-semibold text-neutral-400">Vehicle</div>
                <div className="text-xs font-bold text-white">{request.vehicle_type_name}</div>
              </div>
            </div>
          )}

          {/* Trip Route Details */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs">
                <span className="text-neutral-500 font-extrabold uppercase tracking-wider block text-[10px]">
                  Pickup Point (Punto de Partida)
                </span>
                <span className="text-white font-semibold">{request.pickup_address}</span>
              </div>
            </div>

            <div className="border-t border-neutral-900 ml-6" />

            <div className="flex items-start gap-3.5">
              <div className="w-4 h-4 rounded bg-white border border-neutral-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 bg-black rounded-sm" />
              </div>
              <div className="text-xs">
                <span className="text-neutral-500 font-extrabold uppercase tracking-wider block text-[10px]">
                  Dropoff Point (Destino)
                </span>
                <span className="text-white font-semibold">{request.dropoff_address}</span>
              </div>
            </div>

            {/* Service specific payloads */}
            {request.package_description && (
              <div className="pt-2 border-t border-neutral-900 text-xs text-neutral-400">
                <span className="font-bold text-neutral-200">Package:</span> {request.package_description} ({request.package_weight_kg} kg)
              </div>
            )}
            {request.cargo_description && (
              <div className="pt-2 border-t border-neutral-900 text-xs text-neutral-400">
                <span className="font-bold text-neutral-200">Freight Manifest:</span> {request.cargo_description} ({request.cargo_weight_kg} kg payload)
              </div>
            )}
          </div>

          {/* Payment Card & Action */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  {request.payment_status === 'paid' ? (
                    <>
                      <span className="text-emerald-400">Paid in Full (PSE / Card)</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </>
                  ) : (
                    'Payment Pending (Pago Pendiente)'
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  {request.payment_confirmation || 'Direct payment settlement'}
                </div>
              </div>
            </div>

            {request.payment_status !== 'paid' && !isCancelled && (
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs tracking-tight shadow-xl transition-all flex items-center justify-center gap-1.5"
              >
                {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Pay ${formatCopCurrency(request.price)}`}
              </button>
            )}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Simulation Controls for testing */}
          {!isCancelled && !isCompleted && (
            <div className="p-4 rounded-3xl bg-neutral-950 border border-neutral-800">
              <div className="text-[11px] font-black uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center justify-between">
                <span>Simulation Controls (Simulación Bogotá)</span>
                <span className="text-[10px] text-neutral-500 font-mono">Prototype</span>
              </div>
              <div className="flex gap-2">
                {request.status === 'matched' && (
                  <button
                    onClick={() => handleAdvanceStatus('en_route')}
                    disabled={advancing}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-neutral-800"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Simulate Driver En Route
                  </button>
                )}
                {request.status === 'en_route' && (
                  <button
                    onClick={() => handleAdvanceStatus('completed')}
                    disabled={advancing}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Simulate Arrival at Destination
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cancel Request Button */}
          {!isCancelled && !isCompleted && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-3.5 rounded-2xl bg-black hover:bg-red-950/40 border border-neutral-800 hover:border-red-800 text-neutral-400 hover:text-red-300 font-extrabold text-xs transition-all flex items-center justify-center gap-2"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Trip & Return Vehicle'}
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Live Map Simulator */}
      <div className="lg:col-span-7 h-full min-h-[400px] lg:min-h-full">
        <MapSimulator
          service={request.service}
          status={request.status}
          pickupAddress={request.pickup_address}
          dropoffAddress={request.dropoff_address}
          pickupCoords={{ lat: request.pickup_lat, lng: request.pickup_lng }}
          dropoffCoords={{ lat: request.dropoff_lat, lng: request.dropoff_lng }}
          driverName={request.driver_name}
          driverPlate={request.driver_plate}
          etaMinutes={isCompleted ? 0 : request.duration_minutes}
        />
      </div>
    </div>
  );
}
