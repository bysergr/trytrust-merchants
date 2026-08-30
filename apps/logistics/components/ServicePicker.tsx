'use client';

import React from 'react';
import Image from 'next/image';
import { Car, Package, Truck, ArrowRight, ShieldCheck, Zap, Clock } from 'lucide-react';
import { ServiceType } from '@/lib/types';

interface ServicePickerProps {
  onSelectService: (service: ServiceType) => void;
}

export function ServicePicker({ onSelectService }: ServicePickerProps) {
  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold text-emerald-400 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Integrated Mobility & Logistics Network
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Go anywhere. <br className="hidden sm:block" />
          Ship anything. <br className="hidden sm:block" />
          <span className="text-emerald-400">All in one platform.</span>
        </h1>
        <p className="mt-4 text-neutral-400 text-base sm:text-lg max-w-2xl">
          Seamlessly request passenger rides, on-demand courier parcel delivery, or heavy commercial freight with instant upfront pricing and real-time fleet matching.
        </p>
      </div>

      {/* 3 Main Service Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Ride */}
        <div
          onClick={() => onSelectService('ride')}
          className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/80 rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(6,193,103,0.15)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <Car className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-full">
                Passenger
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Ride
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Everyday rides, comfort sedans, and spacious XL SUVs with verified professional drivers.
            </p>
          </div>

          <div>
            {/* Visual Vehicle Preview */}
            <div className="relative w-full h-32 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 mb-6 overflow-hidden flex items-center justify-center p-2">
              <Image
                src="https://commons.wikimedia.org/wiki/Special:FilePath/Audi_A8_D5_(2021)_IMG_8322.jpg"
                alt="Ride"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-2 group-hover:scale-105 transition-transform"
                unoptimized
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                From $7.50 base
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                Request Ride <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Package */}
        <div
          onClick={() => onSelectService('package')}
          className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/80 rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(6,193,103,0.15)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <Package className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-full">
                Courier Express
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Send a Package
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Door-to-door delivery for documents, parcels, and multi-box orders via motorcycle & van couriers.
            </p>
          </div>

          <div>
            {/* Visual Vehicle Preview */}
            <div className="relative w-full h-32 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 mb-6 overflow-hidden flex items-center justify-center p-2">
              <Image
                src="https://commons.wikimedia.org/wiki/Special:FilePath/Norton_Motorcycle.jpg"
                alt="Package Courier"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-2 group-hover:scale-105 transition-transform"
                unoptimized
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Under 30 min pickup
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                Send Package <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Freight */}
        <div
          onClick={() => onSelectService('freight')}
          className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/80 rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(6,193,103,0.15)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <Truck className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-full">
                Cargo & Logistics
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Move Cargo
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Commercial sprinter vans, 16ft box trucks, and heavy flatbeds for freight, pallets, and large moves.
            </p>
          </div>

          <div>
            {/* Visual Vehicle Preview */}
            <div className="relative w-full h-32 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 mb-6 overflow-hidden flex items-center justify-center p-2">
              <Image
                src="https://commons.wikimedia.org/wiki/Special:FilePath/Red_Ford_Cargo_Vintage_Vehicles_Shildon.jpg"
                alt="Freight Truck"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-2 group-hover:scale-105 transition-transform"
                unoptimized
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Up to 15,000 kg
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                Book Freight <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Bar */}
      <div className="mt-14 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Upfront Price Lock</div>
            <div className="text-neutral-400 text-xs">Guaranteed quote before matching</div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Atomic Fleet Allocation</div>
            <div className="text-neutral-400 text-xs">Guaranteed vehicle availability lock</div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Universal MCP Protocol</div>
            <div className="text-neutral-400 text-xs">Control via AI tools or browser UI</div>
          </div>
        </div>
      </div>
    </section>
  );
}
