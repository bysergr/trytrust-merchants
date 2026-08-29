'use client';

import React from 'react';
import { PayResult } from '@/lib/types';
import {
  CheckCircle2,
  Download,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { VuelaYaLogo } from './VuelaYaLogo';

interface BookingConfirmedModalProps {
  order: PayResult | null;
  isOpen: boolean;
  onClose?: () => void;
  onNewBooking: () => void;
}

export function BookingConfirmedModal({
  order,
  isOpen,
  onNewBooking,
}: BookingConfirmedModalProps) {
  if (!isOpen || !order) return null;

  const depTime = new Date(order.flight.departure_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const arrTime = new Date(order.flight.arrival_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const depDate = new Date(order.flight.departure_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md sm:p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Top Celebration Banner */}
        <div className="bg-[#E01E26] p-6 text-center text-white">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <CheckCircle2 className="size-8 text-white" />
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight">Booking Confirmed!</h2>
          <p className="mt-1 text-xs text-red-100 font-medium">
            Your Colombian domestic flight has been successfully ticketed and confirmed.
          </p>
        </div>

        {/* Boarding Pass Ticket Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ticket Header & Reference */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
            <div className="flex items-center gap-3">
              <VuelaYaLogo size={36} className="size-9 rounded-xl shadow-sm" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Booking Reference Code (PNR)
                </div>
                <div className="font-mono text-2xl font-black text-[#E01E26] dark:text-red-400">
                  {order.booking_reference}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="success" className="px-3 py-1 text-xs font-black uppercase tracking-wider">
                Confirmed & Paid
              </Badge>
            </div>
          </div>

          {/* Flight Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            {/* Flight # and Date */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                  Flight {order.flight.flight_number}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">{order.flight.aircraft_type}</span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {depDate}
              </span>
            </div>

            {/* Route & Times */}
            <div className="grid grid-cols-3 items-center gap-2">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Departure</div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{depTime}</div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {order.flight.origin_city} ({order.flight.origin})
                </div>
              </div>

              <div className="flex flex-col items-center justify-center">
                <ArrowRight className="size-5 text-[#E01E26]" />
                <span className="mt-1 text-[10px] font-bold text-emerald-700 uppercase">Non-Stop</span>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase">Arrival</div>
                <div className="text-xl font-black text-slate-900 dark:text-white">{arrTime}</div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {order.flight.destination_city} ({order.flight.destination})
                </div>
              </div>
            </div>

            {/* Passenger & Seats Info */}
            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold">Primary Passenger</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {order.passengers.name}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  ID: {order.passengers.document_id} • {order.passengers.email}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase font-bold">Confirmed Seat(s)</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {order.seats.map((s) => (
                    <Badge
                      key={s.seat_number}
                      variant={s.cabin_class === 'business' ? 'business' : 'economy'}
                      className="font-mono font-bold"
                    >
                      Seat {s.seat_number} ({s.cabin_class})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Barcode Graphic */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Total Amount Paid</div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                ${order.total_price.toLocaleString('en-US')} COP
              </div>
              <div className="text-[10px] text-slate-400">Transaction completed atomically in SQLite</div>
            </div>

            {/* Barcode placeholder representation */}
            <div className="flex flex-col items-center">
              <div className="flex h-9 items-center gap-[2px]">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-full bg-slate-800 dark:bg-slate-200"
                    style={{ width: `${(i % 3) + 1}px` }}
                  />
                ))}
              </div>
              <span className="font-mono text-[9px] text-slate-500">{order.booking_reference}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-6 dark:border-slate-800">
          <Button variant="outline" onClick={handlePrint} className="gap-1.5 font-bold">
            <Download className="size-4" />
            <span>Print Boarding Pass</span>
          </Button>

          <Button
            onClick={onNewBooking}
            className="rounded-xl bg-[#E01E26] font-black text-white shadow hover:bg-[#C0181E]"
          >
            <RotateCcw className="size-4 mr-1.5" />
            <span>Book Another Flight</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
