'use client';

import React from 'react';
import { OrderDetail } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, MapPin, Package, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface OrderSuccessModalProps {
  order: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderSuccessModal({
  order,
  isOpen,
  onClose,
}: OrderSuccessModalProps) {
  if (!isOpen || !order) return null;

  const address = typeof order.parsed_address === 'object' ? order.parsed_address : null;
  const rawAddress = typeof order.parsed_address === 'string' ? order.parsed_address : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <div className="mx-auto w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-3 ring-4 ring-white/30">
            <CheckCircle2 className="size-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Order Confirmed & Paid!
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">
            Thank you! Your items have been reserved and prepared for express dispatch.
          </p>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Estimated Arrival Hero Card */}
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#FFE600] text-slate-900 shadow-sm shrink-0">
                <Clock className="size-6 text-slate-900" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-600 fill-amber-600" />
                  Estimated Express Delivery
                </span>
                <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                  {order.formatted_arrival}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Calculated within the 4-hour express window from purchase time.
                </p>
              </div>
            </div>

            <Badge variant="melifull" className="bg-emerald-600 text-white shrink-0 text-xs px-3 py-1 font-bold italic">
              ⚡ FULL SPEED
            </Badge>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Info Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Order Number
                </span>
                <Badge variant="success" className="text-[10px] px-2 py-0">
                  PAID
                </Badge>
              </div>
              <p className="font-mono font-bold text-slate-900 break-all text-xs">
                #{order.id}
              </p>
              <div className="pt-2 border-t border-slate-200/60 flex justify-between text-slate-600">
                <span>Date Placed:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(order.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
            </div>

            {/* Destination Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                <MapPin className="size-3.5 text-blue-600" />
                <span>Delivery Address</span>
              </div>
              {address ? (
                <div className="space-y-0.5 text-slate-800">
                  {address.recipient_name && <p className="font-bold text-slate-900">{address.recipient_name}</p>}
                  <p className="font-semibold">{address.street}</p>
                  <p className="text-slate-600">{address.city} {address.postal_code ? `(${address.postal_code})` : ''}</p>
                  {address.phone && <p className="text-slate-500 text-[11px]">Phone: {address.phone}</p>}
                </div>
              ) : (
                <p className="font-medium text-slate-800">{rawAddress}</p>
              )}
            </div>
          </div>

          {/* Purchased Items List */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Package className="size-4 text-[#3483FA]" />
              <span>Purchased Items ({order.items.length})</span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.product_id} className="p-3 bg-white flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-lg bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center p-1 overflow-hidden">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[9px] text-slate-400">SKU</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-slate-500 text-[11px]">
                        {item.properties} • {item.quantity} × ${item.unit_price.toLocaleString('en-US')} COP
                      </p>
                    </div>
                  </div>

                  <span className="font-extrabold text-slate-900 shrink-0">
                    ${item.subtotal.toLocaleString('en-US')} COP
                  </span>
                </div>
              ))}

              <div className="p-3 bg-slate-50 flex items-center justify-between text-sm font-bold text-slate-900">
                <span>Total Paid:</span>
                <span className="text-base font-black text-slate-900">
                  ${order.total.toLocaleString('en-US')} COP
                </span>
              </div>
            </div>
          </div>

          {/* Security & Concurrency Guarantee */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>
              Inventory was updated through an atomic transaction. Order receipt is final and verified.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <Button
            onClick={onClose}
            className="w-full sm:w-auto font-bold text-sm bg-[#2D3277] hover:bg-[#1f2354] text-white px-6 h-10 flex items-center justify-center gap-2"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
