'use client';

import React, { useState } from 'react';
import { X, Cpu, CheckCircle2, ShieldAlert, Zap, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';

interface McpInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function McpInfoModal({ isOpen, onClose }: McpInfoModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const tools = [
    {
      name: 'list_airports',
      desc: 'List all served Colombian airports with IATA codes and cities.',
      sampleInput: '{}',
    },
    {
      name: 'search_flights',
      desc: 'Search scheduled flights between two airports with live availability.',
      sampleInput: '{\n  "origin": "BOG",\n  "destination": "MDE",\n  "departure_date": "2026-08-30",\n  "passengers": 1\n}',
    },
    {
      name: 'compare_flights',
      desc: 'Compare 2 to 4 flights side-by-side.',
      sampleInput: '{\n  "flight_ids": ["flight-uuid-1", "flight-uuid-2"]\n}',
    },
    {
      name: 'get_flight_details',
      desc: 'Get full details and seat availability breakdown by cabin class.',
      sampleInput: '{\n  "flight_id": "flight-uuid-1"\n}',
    },
    {
      name: 'get_seat_map',
      desc: 'Get live seat map with lazy expiration and current statuses.',
      sampleInput: '{\n  "flight_id": "flight-uuid-1"\n}',
    },
    {
      name: 'select_seat',
      desc: 'Temporarily hold a seat for 10 minutes and receive a booking_session_id handle.',
      sampleInput: '{\n  "flight_id": "flight-uuid-1",\n  "seat_number": "1A"\n}',
    },
    {
      name: 'release_seat',
      desc: 'Release a held seat back to available immediately.',
      sampleInput: '{\n  "booking_session_id": "session-uuid",\n  "seat_number": "1A"\n}',
    },
    {
      name: 'pay',
      desc: 'Atomic checkout converting held seats to confirmed booking.',
      sampleInput: '{\n  "booking_session_id": "session-uuid",\n  "passenger_name": "Maria Gomez",\n  "passenger_document_id": "1020304050",\n  "contact_email": "maria@example.com"\n}',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-red-100 text-[#E01E26] dark:bg-red-950 dark:text-red-400">
              <Cpu className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                MCP Server & Architecture Integration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Model Context Protocol (MCP) Tools & Shared Service Layer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close MCP info"
            className="flex size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200">
          {/* Key Principles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
              <div className="flex items-center gap-1.5 font-bold text-[#C0181E] dark:text-red-300 text-xs">
                <CheckCircle2 className="size-4 text-[#E01E26]" />
                <span>Single Source of Truth</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Web UI and MCP tools share the same SQLite database and business service functions.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-xs">
                <Zap className="size-4 text-amber-600" />
                <span>Lazy Hold Expiration</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Seat holds automatically expire after 10 minutes on any read or write access path.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                <ShieldAlert className="size-4 text-emerald-600" />
                <span>Atomic Transactions</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                SQLite IMMEDIATE transactions prevent race conditions during seat holds and payments.
              </p>
            </div>
          </div>

          {/* How to run via stdio and HTTP */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              How to Run MCP Server
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-xs font-mono text-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span># 1. Run MCP server over stdio:</span>
                <button
                  onClick={() => copyToClipboard('pnpm mcp', 101)}
                  className="hover:text-white"
                >
                  {copiedIndex === 101 ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>
              <p className="text-emerald-400">pnpm mcp</p>

              <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span># 2. Run automated MCP tool test suite:</span>
                <button
                  onClick={() => copyToClipboard('pnpm test:mcp', 102)}
                  className="hover:text-white"
                >
                  {copiedIndex === 102 ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>
              <p className="text-emerald-400">pnpm test:mcp</p>

              <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span># 3. Test concurrent seat race-conditions:</span>
                <button
                  onClick={() => copyToClipboard('pnpm test:race', 103)}
                  className="hover:text-white"
                >
                  {copiedIndex === 103 ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>
              <p className="text-emerald-400">pnpm test:race</p>
            </div>
          </div>

          {/* List of 8 MCP Tools */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered MCP Tools (8 Available)
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {tools.map((t, idx) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#E01E26] dark:text-red-400">
                      {t.name}
                    </span>
                    <button
                      onClick={() => copyToClipboard(t.sampleInput, idx)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      title="Copy sample JSON input"
                    >
                      {copiedIndex === idx ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {t.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
