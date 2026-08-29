'use client';

import React, { useState } from 'react';
import { FlightSearchResult, PayResult, Seat } from '@/lib/types';
import { X, ShieldCheck, CreditCard, Lock, AlertCircle, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface CheckoutModalProps {
  flight: FlightSearchResult | null;
  heldSeats: Seat[];
  totalPrice: number;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (result: PayResult) => void;
}

export function CheckoutModal({
  flight,
  heldSeats,
  totalPrice,
  isOpen,
  onClose,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const [passengerName, setPassengerName] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !flight) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName.trim() || !documentId.trim() || !email.trim()) {
      setError('Please fill in all passenger details.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passenger_name: passengerName.trim(),
          passenger_document_id: documentId.trim(),
          contact_email: email.trim(),
          payment_confirmation: {
            method: 'simulated_card',
            currency: 'COP',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment and checkout failed');
      }

      onPaymentSuccess(data as PayResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing booking payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-red-50 text-[#E01E26] dark:bg-red-950 dark:text-red-400">
              <Lock className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Secure Checkout & Payment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Finalize your domestic Colombian flight booking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Flight & Seat Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <span className="font-mono text-sm font-black text-[#E01E26] dark:text-red-400">
                  {flight.flight_number}
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {flight.origin_city} ({flight.origin}) → {flight.destination_city} ({flight.destination})
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-bold">
                {flight.aircraft_type}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Departure:</span>{' '}
                {new Date(flight.departure_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Duration:</span> {flight.duration_minutes} min (Non-stop)
              </div>
            </div>

            {/* Held Seats Pill */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Assigned Seats:</span>
              {heldSeats.map((s) => (
                <Badge
                  key={s.seat_number}
                  variant={s.cabin_class === 'business' ? 'business' : 'economy'}
                  className="font-mono font-bold"
                >
                  {s.seat_number} ({s.cabin_class}) - ${s.price.toLocaleString('en-US')} COP
                </Badge>
              ))}
            </div>
          </div>

          {/* Passenger Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <User className="size-4 text-[#E01E26]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Primary Passenger Information
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Full Name (as on National ID / Passport) *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Maria Camila Gomez"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Document ID / Passport / C.C. *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 1020304050"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Contact Email (for e-ticket receipt) *
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. maria.gomez@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Simulated Payment Notice */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Simulated Payment Gateway (Test Mode)</span>
            </div>
            <p className="mt-1 text-emerald-800/80 dark:text-emerald-400/80">
              No real credit card charge will be made. Clicking Pay will atomically convert your held seats to confirmed booked status inside a SQLite database transaction.
            </p>
          </div>

          {/* Total & Submit Button */}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Total Amount Due:</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                ${totalPrice.toLocaleString('en-US')} COP
              </span>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-2xl bg-[#E01E26] font-black text-white shadow-lg shadow-red-600/25 hover:bg-[#C0181E] disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing Atomic Booking Transaction...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4" />
                  <span>Pay ${totalPrice.toLocaleString('en-US')} COP & Confirm</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
