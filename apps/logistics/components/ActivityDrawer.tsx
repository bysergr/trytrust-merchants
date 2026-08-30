'use client';

import React from 'react';
import { Car, Package, Truck, ArrowRight, Clock, X } from 'lucide-react';
import { formatCopCurrency } from './VehicleCard';
import { ServiceRequest } from '@/lib/types';

interface ActivityDrawerProps {
  requests: ServiceRequest[];
  isOpen: boolean;
  onClose: () => void;
  onSelectRequest: (id: string) => void;
}

export function ActivityDrawer({ requests, isOpen, onClose, onSelectRequest }: ActivityDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full flex flex-col shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-xl font-black text-white">Your Bogotá Trips</h3>
            <p className="text-xs text-neutral-400">Current session requests & bookings</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex-1 space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
              No rides or deliveries requested in this session yet.
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  onSelectRequest(r.id);
                  onClose();
                }}
                className="p-4 rounded-3xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-white cursor-pointer transition-all flex flex-col justify-between gap-3 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-black border border-neutral-800 flex items-center justify-center text-white">
                      {r.service === 'package' ? (
                        <Package className="w-4 h-4 text-emerald-400" />
                      ) : r.service === 'freight' ? (
                        <Truck className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Car className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-extrabold text-sm">{r.vehicle_type_name || r.service}</h4>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-white">{formatCopCurrency(r.price)}</div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        r.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : r.status === 'cancelled'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-neutral-400 space-y-1">
                  <div className="truncate">
                    <span className="text-neutral-500 font-bold">To:</span> {r.dropoff_address}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span>Track & Details</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
