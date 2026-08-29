'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FlightSearchResult, Seat, SeatMapItem, SeatMapResult } from '@/lib/types';
import {
  X,
  Clock,
  AlertCircle,
  Check,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SeatSelectionModalProps {
  flight: FlightSearchResult | null;
  passengersCount: number;
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: (heldSeats: Seat[], totalPrice: number) => void;
}

export function SeatSelectionModal({
  flight,
  passengersCount,
  isOpen,
  onClose,
  onProceedToCheckout,
}: SeatSelectionModalProps) {
  const [seatMap, setSeatMap] = useState<SeatMapResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [heldSeats, setHeldSeats] = useState<Seat[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Fetch seat map
  const fetchSeatMap = useCallback(async () => {
    if (!flight) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/seats?flight_id=${flight.id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load seat map');
      }
      setSeatMap(data.seat_map);

      // Check for seats held by current session
      const sessionHeldSeats: Seat[] = (data.seat_map.seats as SeatMapItem[])
        .filter((s) => s.is_held_by_current_session)
        .map((s) => ({
          id: s.id,
          flight_id: flight.id,
          seat_number: s.seat_number,
          cabin_class: s.cabin_class,
          status: s.status,
          held_until: s.held_until,
          version: 1,
          price: s.price,
        }));

      setHeldSeats(sessionHeldSeats);

      if (sessionHeldSeats.length > 0 && sessionHeldSeats[0].held_until) {
        setHoldExpiresAt(sessionHeldSeats[0].held_until);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error fetching seat map');
    } finally {
      setLoading(false);
    }
  }, [flight]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (!isOpen || !flight) return;
      try {
        setLoading(true);
        setErrorMessage(null);
        const res = await fetch(`/api/seats?flight_id=${flight.id}`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load seat map');
        }
        setSeatMap(data.seat_map);

        const sessionHeldSeats: Seat[] = (data.seat_map.seats as SeatMapItem[])
          .filter((s) => s.is_held_by_current_session)
          .map((s) => ({
            id: s.id,
            flight_id: flight.id,
            seat_number: s.seat_number,
            cabin_class: s.cabin_class,
            status: s.status,
            held_until: s.held_until,
            version: 1,
            price: s.price,
          }));

        setHeldSeats(sessionHeldSeats);

        if (sessionHeldSeats.length > 0 && sessionHeldSeats[0].held_until) {
          setHoldExpiresAt(sessionHeldSeats[0].held_until);
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err instanceof Error ? err.message : 'Error fetching seat map');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [isOpen, flight]);

  // Live countdown timer effect
  useEffect(() => {
    if (!holdExpiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(holdExpiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setSecondsRemaining(0);
        setHoldExpiresAt(null);
        setHeldSeats([]);
        fetchSeatMap();
      } else {
        setSecondsRemaining(Math.floor(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdExpiresAt, fetchSeatMap]);

  // Handle seat click (select or release)
  const handleSeatClick = async (seat: SeatMapItem) => {
    if (!flight) return;
    setErrorMessage(null);

    const isAlreadyHeldByYou = heldSeats.some((s) => s.seat_number === seat.seat_number);

    if (isAlreadyHeldByYou) {
      // Release this seat
      try {
        setActionLoading(seat.seat_number);
        const res = await fetch('/api/seats/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seat_number: seat.seat_number }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to release seat');
        }
        setHeldSeats(data.remaining_held_seats);
        if (data.remaining_held_seats.length === 0) {
          setHoldExpiresAt(null);
          setSecondsRemaining(null);
        }
        await fetchSeatMap();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Error releasing seat');
      } finally {
        setActionLoading(null);
      }
    } else {
      // Check if user already reached passengers limit
      if (heldSeats.length >= passengersCount) {
        setErrorMessage(
          `You have already selected ${passengersCount} seat(s) for ${passengersCount} passenger(s). Deselect a seat to choose a different one.`
        );
        return;
      }

      // Check availability
      if (seat.status !== 'available') {
        setErrorMessage(
          `Seat ${seat.seat_number} is currently ${seat.status === 'booked' ? 'already booked' : 'held by another customer'}.`
        );
        return;
      }

      // Select and hold seat
      try {
        setActionLoading(seat.seat_number);
        const res = await fetch('/api/seats/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flight_id: flight.id,
            seat_number: seat.seat_number,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to hold seat');
        }

        setHeldSeats(data.all_held_seats);
        setHoldExpiresAt(data.held_until);
        await fetchSeatMap();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Error selecting seat');
      } finally {
        setActionLoading(null);
      }
    }
  };

  if (!isOpen || !flight) return null;

  const totalHeldPrice = heldSeats.reduce((sum, s) => sum + s.price, 0);
  const seatsNeeded = Math.max(1, passengersCount);
  const isSelectionComplete = heldSeats.length === seatsNeeded;

  const timerMin = secondsRemaining !== null ? Math.floor(secondsRemaining / 60) : 0;
  const timerSec = secondsRemaining !== null ? secondsRemaining % 60 : 0;
  const formattedTimer = `${timerMin}:${timerSec < 10 ? '0' : ''}${timerSec}`;

  // Group seats by cabin class and rows
  const businessSeats = seatMap?.seats.filter((s) => s.cabin_class === 'business') || [];
  const economySeats = seatMap?.seats.filter((s) => s.cabin_class === 'economy') || [];

  const businessRows = Array.from(new Set(businessSeats.map((s) => s.row))).sort((a, b) => a - b);
  const economyRows = Array.from(new Set(economySeats.map((s) => s.row))).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-[#E01E26] dark:text-red-400">
                {flight.flight_number}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Seat Selection
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {flight.origin_city} ({flight.origin}) → {flight.destination_city} ({flight.destination}) • Select {seatsNeeded} seat(s) for {seatsNeeded} passenger(s)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Hold Timer Badge */}
            {secondsRemaining !== null && secondsRemaining > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                <Clock className="size-3.5" />
                <span>Hold expires in {formattedTimer}</span>
              </div>
            )}

            <button
              onClick={onClose}
              aria-label="Close seat selection"
              className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Legend bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="size-4 rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800" />
              <span className="text-slate-600 dark:text-slate-400">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-4 rounded-md bg-[#E01E26] shadow-sm" />
              <span className="font-bold text-[#C0181E] dark:text-red-400">Your Selection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-4 rounded-md bg-amber-100 border border-amber-300 dark:bg-amber-950/60 dark:border-amber-800" />
              <span className="text-slate-500 dark:text-slate-400">Temporarily Held</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-4 rounded-md bg-slate-300 dark:bg-slate-700" />
              <span className="text-slate-400 dark:text-slate-500">Booked</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSeatMap}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#E01E26]"
            >
              <RefreshCw className="size-3" />
              <span>Refresh Map</span>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-6 py-2 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Seat Map Visual Fuselage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="size-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
              <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                Loading live seat inventory...
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-xl">
              {/* Aircraft Cockpit Nose */}
              <div className="mx-auto mb-6 flex flex-col items-center">
                <div className="h-14 w-40 rounded-t-full border-t-4 border-x-4 border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Cockpit • Front
                  </span>
                </div>
                <div className="h-4 w-56 border-x-4 border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" />
              </div>

              {/* Fuselage container */}
              <div className="rounded-3xl border-4 border-slate-300 bg-slate-50/70 p-4 shadow-xl dark:border-slate-700 dark:bg-slate-950/60 sm:p-6">
                {/* 1. Business Class Section */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 dark:border-amber-900/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="business" className="text-xs font-bold">
                        Business Class
                      </Badge>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        2x2 Layout (A C | D F) • Extra 38-inch Legroom
                      </span>
                    </div>
                  </div>

                  {/* Business Rows */}
                  <div className="space-y-2.5">
                    {businessRows.map((rowNum) => {
                      const rowSeats = businessSeats.filter((s) => s.row === rowNum);
                      const seatA = rowSeats.find((s) => s.letter === 'A');
                      const seatC = rowSeats.find((s) => s.letter === 'C');
                      const seatD = rowSeats.find((s) => s.letter === 'D');
                      const seatF = rowSeats.find((s) => s.letter === 'F');

                      return (
                        <div key={`bus-row-${rowNum}`} className="flex items-center justify-between gap-1 sm:gap-2">
                          {/* Row Number */}
                          <div className="w-6 text-center text-xs font-bold text-slate-400">
                            {rowNum}
                          </div>

                          {/* Left Seats (A, C) */}
                          <div className="flex gap-2">
                            {seatA && renderSeatButton(seatA)}
                            {seatC && renderSeatButton(seatC)}
                          </div>

                          {/* Aisle */}
                          <div className="flex flex-1 items-center justify-center px-1">
                            <div className="h-6 w-[2px] bg-slate-200 dark:bg-slate-800" />
                          </div>

                          {/* Right Seats (D, F) */}
                          <div className="flex gap-2">
                            {seatD && renderSeatButton(seatD)}
                            {seatF && renderSeatButton(seatF)}
                          </div>

                          {/* Row Number */}
                          <div className="w-6 text-center text-xs font-bold text-slate-400">
                            {rowNum}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Galley / Curtain separator */}
                <div className="my-6 flex items-center justify-center gap-3">
                  <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700" />
                  <span className="rounded-full bg-slate-200 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Galley & Lavatories
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-700" />
                </div>

                {/* 2. Economy Class Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-sky-200/80 pb-2 dark:border-sky-900/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="economy" className="text-xs font-bold">
                        Economy Class
                      </Badge>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        3x3 Layout (A B C | D E F)
                      </span>
                    </div>
                  </div>

                  {/* Economy Rows */}
                  <div className="space-y-2">
                    {economyRows.map((rowNum) => {
                      const isExitRow = rowNum === 14 || rowNum === 15;
                      const rowSeats = economySeats.filter((s) => s.row === rowNum);
                      const seatA = rowSeats.find((s) => s.letter === 'A');
                      const seatB = rowSeats.find((s) => s.letter === 'B');
                      const seatC = rowSeats.find((s) => s.letter === 'C');
                      const seatD = rowSeats.find((s) => s.letter === 'D');
                      const seatE = rowSeats.find((s) => s.letter === 'E');
                      const seatF = rowSeats.find((s) => s.letter === 'F');

                      return (
                        <React.Fragment key={`eco-row-${rowNum}`}>
                          {isExitRow && rowNum === 14 && (
                            <div className="my-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <span>⚠️ Emergency Exit Rows (Rows 14 & 15) • Extra Legroom</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-1 sm:gap-1.5">
                            {/* Row Number */}
                            <div className="w-6 text-center text-xs font-bold text-slate-400">
                              {rowNum}
                            </div>

                            {/* Left Triplet (A, B, C) */}
                            <div className="flex gap-1 sm:gap-1.5">
                              {seatA && renderSeatButton(seatA)}
                              {seatB && renderSeatButton(seatB)}
                              {seatC && renderSeatButton(seatC)}
                            </div>

                            {/* Center Aisle */}
                            <div className="flex w-6 items-center justify-center">
                              <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-700">
                                ║
                              </span>
                            </div>

                            {/* Right Triplet (D, E, F) */}
                            <div className="flex gap-1 sm:gap-1.5">
                              {seatD && renderSeatButton(seatD)}
                              {seatE && renderSeatButton(seatE)}
                              {seatF && renderSeatButton(seatF)}
                            </div>

                            {/* Row Number */}
                            <div className="w-6 text-center text-xs font-bold text-slate-400">
                              {rowNum}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="border-t border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Selection info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Selected Seats ({heldSeats.length} of {seatsNeeded}):
                </span>
                {heldSeats.length === 0 ? (
                  <span className="text-xs font-bold text-slate-400">None selected</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {heldSeats.map((s) => (
                      <Badge
                        key={s.seat_number}
                        variant={s.cabin_class === 'business' ? 'business' : 'economy'}
                        className="text-xs font-mono font-bold"
                      >
                        {s.seat_number} (${s.price.toLocaleString('en-US')})
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  ${totalHeldPrice.toLocaleString('en-US')} COP
                </span>
                <span className="text-xs text-slate-500">Total for all passengers</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onProceedToCheckout(heldSeats, totalHeldPrice)}
                disabled={!isSelectionComplete || heldSeats.length === 0}
                className="h-12 rounded-2xl bg-[#E01E26] px-6 font-black text-white shadow-lg shadow-red-600/25 hover:bg-[#C0181E] disabled:opacity-50"
              >
                <span>Proceed to Checkout</span>
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function renderSeatButton(seat: SeatMapItem) {
    const isHeldByYou = heldSeats.some((s) => s.seat_number === seat.seat_number);
    const isAvailable = seat.status === 'available';
    const isHeldByOther = seat.status === 'held' && !isHeldByYou;
    const isBooked = seat.status === 'booked';
    const isLoadingThis = actionLoading === seat.seat_number;

    let buttonClass = '';
    if (isHeldByYou) {
      buttonClass =
        'bg-[#E01E26] text-white font-black shadow-md shadow-red-600/30 ring-2 ring-red-400 scale-105';
    } else if (isAvailable) {
      buttonClass =
        seat.cabin_class === 'business'
          ? 'bg-amber-50/80 border border-amber-300 text-amber-900 hover:bg-amber-100 hover:scale-105 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
          : 'bg-white border border-slate-300 text-slate-800 hover:border-red-400 hover:bg-red-50 hover:text-[#E01E26] hover:scale-105 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700';
    } else if (isHeldByOther) {
      buttonClass =
        'bg-amber-100 border border-amber-200 text-amber-600/70 cursor-not-allowed dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-500/70';
    } else {
      buttonClass =
        'bg-slate-200/90 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600';
    }

    return (
      <button
        key={seat.id}
        type="button"
        disabled={isLoadingThis || isBooked || isHeldByOther}
        onClick={() => handleSeatClick(seat)}
        title={`Seat ${seat.seat_number} - ${seat.cabin_class.toUpperCase()} - $${seat.price.toLocaleString('en-US')} COP - ${isHeldByYou ? 'Selected (Click to release)' : isAvailable ? 'Available' : seat.status}`}
        className={`relative flex size-8 sm:size-9 items-center justify-center rounded-xl text-[11px] font-bold transition-all ${buttonClass}`}
      >
        {isLoadingThis ? (
          <div className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isHeldByYou ? (
          <Check className="size-4 stroke-[3]" />
        ) : (
          seat.letter
        )}
      </button>
    );
  }
}
