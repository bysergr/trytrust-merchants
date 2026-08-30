'use client';

import React from 'react';
import Image from 'next/image';
import { Car, Package, Truck, ArrowRight, ShieldCheck, Zap, Clock, MapPin } from 'lucide-react';
import { ServiceType } from '@/lib/types';

interface ServicePickerProps {
  onSelectService: (service: ServiceType) => void;
}

export function ServicePicker({ onSelectService }: ServicePickerProps) {
  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-bold text-emerald-400 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Bogotá D.C. Integrated Mobility & Logistics Network
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Every ride. Every parcel. <br className="hidden sm:block" />
          Every cargo shipment in Bogotá. <br className="hidden sm:block" />
          <span className="text-emerald-400">Under one unified platform.</span>
        </h1>
        <p className="mt-4 text-neutral-400 text-base sm:text-lg max-w-2xl">
          On-demand passenger rides, urgent courier delivery, and commercial freight transport across all 20 localities of Bogotá and the Cundinamarca industrial corridor.
        </p>
      </div>

      {/* 3 Main Service Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Ride */}
        <div
          onClick={() => onSelectService('ride')}
          className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-white rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-black border border-neutral-800 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
                <Car className="w-7 h-7" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
                Bogotá Passenger
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Ride (Viajes)
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Economy City Sedans, spacious Comfort Plus, and Executive Black VIP across Chicó, Chapinero, Usaquén, and El Dorado.
            </p>
          </div>

          <div>
            {/* Visual Vehicle Preview */}
            <div className="relative w-full h-36 rounded-2xl bg-neutral-950 border border-neutral-800/80 mb-6 overflow-hidden flex items-center justify-center p-0">
              <Image
                src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
                alt="Logistics Passenger Ride"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                From $6.800 COP
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-white group-hover:translate-x-1 transition-transform">
                Request Ride <ArrowRight className="w-4 h-4 text-emerald-400" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Package */}
        <div
          onClick={() => onSelectService('package')}
          className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-white rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-black border border-neutral-800 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
                <Package className="w-7 h-7" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
                Logistics Express Envíos
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Send a Package (Envíos)
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Door-to-door express parcel delivery via motorcycle couriers and covered vans through Bogotá traffic.
            </p>
          </div>

          <div>
            {/* Visual Vehicle Preview */}
            <div className="relative w-full h-36 rounded-2xl bg-neutral-950 border border-neutral-800/80 mb-6 overflow-hidden flex items-center justify-center p-0">
              <Image
                src="https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80"
                alt="Package Courier Delivery"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Under 15 min pickup
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-white group-hover:translate-x-1 transition-transform">
                Send Package <ArrowRight className="w-4 h-4 text-emerald-400" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Freight */}
        <div
          onClick={() => onSelectService('freight')}
          className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-white rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-black border border-neutral-800 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all">
                <Truck className="w-7 h-7" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full">
                Carga & Logística
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Move Cargo (Carga)
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              Commercial sprinter vans, 16ft box trucks, and heavy flatbeds for freight between Fontibón, Siberia, and Funza.
            </p>
          </div>

          <div>
            {/* Visual Vehicle Preview */}
            <div className="relative w-full h-36 rounded-2xl bg-neutral-950 border border-neutral-800/80 mb-6 overflow-hidden flex items-center justify-center p-0">
              <Image
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80"
                alt="Freight Logistics Cargo Truck"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Up to 15,000 kg
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-white group-hover:translate-x-1 transition-transform">
                Book Freight <ArrowRight className="w-4 h-4 text-emerald-400" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Bar */}
      <div className="mt-12 p-6 rounded-3xl bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-white text-sm">Bogotá Urban Coverage</div>
            <div className="text-neutral-400 text-xs">All localities & Cundinamarca corridor</div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-white text-sm">Atomic Lock Inventory</div>
            <div className="text-neutral-400 text-xs">Guaranteed vehicle dispatch without double-booking</div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-white text-sm">Universal MCP Protocol</div>
            <div className="text-neutral-400 text-xs">Query quotes & dispatch via AI or Web UI</div>
          </div>
        </div>
      </div>
    </section>
  );
}
