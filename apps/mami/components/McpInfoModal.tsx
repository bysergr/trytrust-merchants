'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Terminal, Copy, Check, Server, ShieldAlert, Cpu } from 'lucide-react';

interface McpInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function McpInfoModal({ isOpen, onClose }: McpInfoModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tools = [
    {
      name: 'list_products',
      desc: 'List catalog items with pagination and optional category filter.',
      params: '{ page?: number, limit?: number, category?: string }',
    },
    {
      name: 'search_products',
      desc: 'Search products by query text matching title, description, or category.',
      params: '{ query: string, category?: string, limit?: number }',
    },
    {
      name: 'add_to_cart',
      desc: 'Add item to cart. Omit session_id on first call to auto-generate a new session.',
      params: '{ session_id?: string, product_id: string, quantity: number }',
    },
    {
      name: 'remove_from_cart',
      desc: 'Remove product or subtract quantity from active cart.',
      params: '{ session_id: string, product_id: string, quantity?: number }',
    },
    {
      name: 'review_cart',
      desc: 'Review all items, quantities, and totals in active cart before checkout.',
      params: '{ session_id: string }',
    },
    {
      name: 'pay',
      desc: 'Atomic checkout and payment. Decrements stock and calculates 4-hour ETA.',
      params: '{ session_id: string, delivery_address: string | object }',
    },
  ];

  const claudeConfigJson = JSON.stringify(
    {
      mcpServers: {
        'mami-store': {
          command: 'npx',
          args: ['tsx', 'scripts/mcp-server.ts'],
          cwd: process.cwd(),
        },
      },
    },
    null,
    2
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-[#2D3277] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-400 text-slate-950 font-bold">
              <Terminal className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                MCP Server (Model Context Protocol)
              </h2>
              <p className="text-xs text-white/80">
                Shared SQLite database &amp; service layer architecture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close MCP info modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Architecture info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Server className="size-4 text-blue-600" />
                <span>Single Source of Truth</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Both the Web UI and MCP Server query the exact same local SQLite database.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Cpu className="size-4 text-emerald-600" />
                <span>Application-Level Token</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Spec 2026-07-28 compliant: session_id is an opaque server-generated UUID.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ShieldAlert className="size-4 text-amber-600" />
                <span>Atomic Concurrency</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                SQLite IMMEDIATE transactions prevent overselling even under high load.
              </p>
            </div>
          </div>

          {/* 6 MCP Tools List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Registered MCP Tools (6 Tools Available)
              </h3>
              <span className="text-[11px] font-semibold text-emerald-600">
                English Only User-Facing Text
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tools.map((t) => (
                <div key={t.name} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700">{t.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{t.desc}</p>
                  <p className="font-mono text-[10px] text-slate-500 bg-white p-1 rounded border border-slate-200 overflow-x-auto">
                    {t.params}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start Commands */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900">CLI &amp; Test Commands</h3>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 flex items-center justify-between">
                <span>pnpm tsx scripts/mcp-server.ts</span>
                <button
                  onClick={() => handleCopy('pnpm tsx scripts/mcp-server.ts', 'cmd1')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  {copiedKey === 'cmd1' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 flex items-center justify-between">
                <span>pnpm tsx scripts/test-mcp.ts</span>
                <button
                  onClick={() => handleCopy('pnpm tsx scripts/test-mcp.ts', 'cmd2')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  {copiedKey === 'cmd2' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-200 flex items-center justify-between">
                <span>pnpm tsx scripts/test-race-condition.ts</span>
                <button
                  onClick={() => handleCopy('pnpm tsx scripts/test-race-condition.ts', 'cmd3')}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  {copiedKey === 'cmd3' ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Claude Desktop Config Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Claude Desktop / Cursor Config</h3>
              <button
                onClick={() => handleCopy(claudeConfigJson, 'claudeConfig')}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                {copiedKey === 'claudeConfig' ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                <span>Copy JSON</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto">
              {claudeConfigJson}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <Button
            onClick={onClose}
            className="font-bold text-xs bg-[#2D3277] text-white px-5"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
