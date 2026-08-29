'use client';

import React from 'react';
import { Cpu, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { VuelaYaBrand } from './VuelaYaLogo';

interface NavbarProps {
  onOpenMcpModal: () => void;
  onResetDb?: () => void;
}

export function Navbar({ onOpenMcpModal }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <VuelaYaBrand />

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" />
              <span>Real-Time Hold Locking</span>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              COP ($)
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMcpModal}
            className="flex items-center gap-1.5 font-bold border-red-200 text-[#E01E26] hover:bg-red-50 hover:text-[#C0181E] dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <Cpu className="size-4 text-[#E01E26] dark:text-red-400" />
            <span className="hidden sm:inline">MCP Server API</span>
            <span className="sm:hidden">MCP</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
