'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Save,
  Check,
  Loader2,
  AlertCircle,
  Car,
  Package,
  Truck,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ServiceRequest } from '@/lib/types';

interface RowEditState {
  price: string;
  scheduled_at: string;
}

export default function AdminPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editStates, setEditStates] = useState<Record<string, RowEditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAdminRequests = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/admin/requests');
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
        const initialEdits: Record<string, RowEditState> = {};
        for (const req of data.requests) {
          initialEdits[req.id] = {
            price: req.price.toString(),
            scheduled_at: req.scheduled_at
              ? new Date(req.scheduled_at).toISOString().slice(0, 16)
              : '',
          };
        }
        setEditStates(initialEdits);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch('/api/admin/requests');
        const data = await res.json();
        if (!ignore && data.requests) {
          setRequests(data.requests);
          const initialEdits: Record<string, RowEditState> = {};
          for (const req of data.requests) {
            initialEdits[req.id] = {
              price: req.price.toString(),
              scheduled_at: req.scheduled_at
                ? new Date(req.scheduled_at).toISOString().slice(0, 16)
                : '',
            };
          }
          setEditStates(initialEdits);
        }
      } catch (err) {
        if (!ignore) setErrorMsg(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleFieldChange = (id: string, field: keyof RowEditState, value: string) => {
    setEditStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveRow = async (id: string) => {
    const edit = editStates[id];
    if (!edit) return;

    setSavingId(id);
    setErrorMsg(null);
    try {
      const parsedPrice = edit.price ? parseFloat(edit.price) : undefined;
      const parsedScheduledAt = edit.scheduled_at ? new Date(edit.scheduled_at).toISOString() : null;

      const res = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: parsedPrice,
          scheduled_at: parsedScheduledAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update request');
      }

      setRequests((prev) => prev.map((r) => (r.id === id ? data.request : r)));
      setSaveSuccessId(id);
      setTimeout(() => setSaveSuccessId(null), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating request');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-black sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to App
            </Link>
            <span className="text-neutral-700">|</span>
            <BrandLogo size="sm" showSubtitle={false} />
            <span className="text-neutral-700 hidden sm:inline">|</span>
            <h1 className="hidden sm:inline text-sm font-black tracking-tight text-neutral-300">
              Admin Dispatch & Pricing Portal
            </h1>
          </div>

          <button
            onClick={fetchAdminRequests}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs font-bold text-neutral-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Loud Prototype Warning Banner */}
        <div className="p-5 rounded-3xl bg-amber-950/40 border border-amber-800/80 text-amber-200 flex items-start gap-3.5 shadow-2xl">
          <ShieldAlert className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <div className="font-extrabold text-amber-300 uppercase tracking-wide">
              ⚠️ PROTOTYPE ONLY: UNPROTECTED ADMIN ROUTE
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              This route is <strong>deliberately unauthenticated</strong> per hackathon & prototype instructions. In production, this portal and its underlying API endpoints (<code className="bg-amber-900/60 px-1 py-0.5 rounded font-mono text-xs">/api/admin/*</code>) must be strictly secured with role-based authentication.
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-black border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-black text-white">All Bogotá Service Requests</h2>
              <p className="text-xs text-neutral-400">
                Directly edit <span className="text-emerald-400 font-bold">Price ($ COP)</span> and <span className="text-emerald-400 font-bold">Scheduled At</span> inline. Click Save to persist via <code className="text-neutral-300 font-mono text-[11px]">PATCH /api/admin/requests/:id</code>.
              </p>
            </div>
            <div className="text-xs font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
              Total Records: {requests.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-900/90 text-neutral-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-neutral-800">
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Price ($ COP) [Editable]</th>
                  <th className="py-3.5 px-4 min-w-[210px]">Scheduled At [Editable]</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Pickup Location</th>
                  <th className="py-3.5 px-4 min-w-[220px]">Dropoff Location</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500">
                      {loading ? 'Loading requests...' : 'No service requests found.'}
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => {
                    const edit = editStates[r.id] || { price: r.price.toString(), scheduled_at: '' };
                    const isSaving = savingId === r.id;
                    const isSaved = saveSuccessId === r.id;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-neutral-900/50 transition-colors group"
                      >
                        {/* ID */}
                        <td className="py-4 px-4 font-mono font-bold text-neutral-300">
                          {r.id}
                        </td>

                        {/* Service */}
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-200">
                            {r.service === 'package' ? (
                              <Package className="w-3 h-3 text-emerald-400" />
                            ) : r.service === 'freight' ? (
                              <Truck className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Car className="w-3 h-3 text-emerald-400" />
                            )}
                            <span className="capitalize">{r.service}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : r.status === 'cancelled'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : r.status === 'en_route'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>

                        {/* Price (Editable in COP) */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-neutral-500 font-bold">$</span>
                            <input
                              type="number"
                              step="100"
                              min="0"
                              value={edit.price}
                              onChange={(e) => handleFieldChange(r.id, 'price', e.target.value)}
                              className="w-28 px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-black text-xs focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-neutral-500 font-mono">COP</span>
                          </div>
                        </td>

                        {/* Scheduled At (Editable) */}
                        <td className="py-4 px-4">
                          <input
                            type="datetime-local"
                            value={edit.scheduled_at}
                            onChange={(e) => handleFieldChange(r.id, 'scheduled_at', e.target.value)}
                            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </td>

                        {/* Pickup */}
                        <td className="py-4 px-4 text-neutral-300 max-w-xs truncate" title={r.pickup_address}>
                          {r.pickup_address}
                        </td>

                        {/* Dropoff */}
                        <td className="py-4 px-4 text-neutral-300 max-w-xs truncate" title={r.dropoff_address}>
                          {r.dropoff_address}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveRow(r.id)}
                              disabled={isSaving}
                              className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all ${
                                isSaved
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 hover:border-neutral-600'
                              }`}
                            >
                              {isSaving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isSaved ? (
                                <>
                                  <Check className="w-3 h-3" /> Saved
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3 text-emerald-400" /> Save
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
