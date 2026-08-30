'use client';

import React, { useEffect, useState } from 'react';
import { Navigation, Car, Package, Truck, Compass } from 'lucide-react';
import { RequestStatus, ServiceType } from '@/lib/types';

interface MapSimulatorProps {
  service?: ServiceType;
  status?: RequestStatus;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  driverName?: string | null;
  driverPlate?: string | null;
  etaMinutes?: number;
  onSelectPreset?: (pickup: string, dropoff: string) => void;
}

export function MapSimulator({
  service = 'ride',
  status,
  pickupAddress = 'Downtown Center',
  dropoffAddress = 'Destination Wharf',
  pickupCoords = { lat: 37.7857, lng: -122.4064 },
  dropoffCoords = { lat: 37.8087, lng: -122.4098 },
  driverName,
  driverPlate,
  etaMinutes = 6,
}: MapSimulatorProps) {
  const [vehicleProgress, setVehicleProgress] = useState(0.2);

  // Animate vehicle movement when active
  useEffect(() => {
    if (status === 'matched' || status === 'en_route') {
      const interval = setInterval(() => {
        setVehicleProgress((prev) => {
          const next = prev + 0.04;
          return next > 0.95 ? 0.05 : next;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Coordinate projections into 1000x700 SVG canvas
  // San Francisco bounds ~ lat: 37.70 to 37.83, lng: -122.52 to -122.35
  const projectX = (lng: number) => {
    const minLng = -122.52;
    const maxLng = -122.35;
    return Math.max(100, Math.min(900, ((lng - minLng) / (maxLng - minLng)) * 800 + 100));
  };

  const projectY = (lat: number) => {
    const minLat = 37.70;
    const maxLat = 37.83;
    return Math.max(80, Math.min(620, 700 - (((lat - minLat) / (maxLat - minLat)) * 540 + 80)));
  };

  const startX = projectX(pickupCoords.lng);
  const startY = projectY(pickupCoords.lat);
  const endX = projectX(dropoffCoords.lng);
  const endY = projectY(dropoffCoords.lat);

  // Bezier curve control points for realistic curved road trajectory
  const midX = (startX + endX) / 2 + (endY - startY) * 0.18;
  const midY = (startY + endY) / 2 - (endX - startX) * 0.18;

  // Quadratic Bezier interpolation for vehicle position
  const t = status === 'completed' ? 1.0 : status === 'matched' ? 0.15 : vehicleProgress;
  const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
  const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;

  return (
    <div className="relative w-full h-full min-h-[380px] lg:min-h-[540px] bg-neutral-950 overflow-hidden select-none">
      {/* SVG Map Canvas */}
      <svg
        className="w-full h-full absolute inset-0 object-cover"
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06c167" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a192f" />
            <stop offset="100%" stopColor="#0d213a" />
          </linearGradient>
          <pattern id="cityGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f242e" strokeWidth="0.75" />
          </pattern>
        </defs>

        {/* Base Map Surfaces */}
        <rect width="1000" height="700" fill="#0f1115" />
        <rect width="1000" height="700" fill="url(#cityGrid)" />

        {/* Simulated Water Body / Bay Coastline */}
        <path
          d="M 680 0 Q 720 220, 640 380 T 820 700 L 1000 700 L 1000 0 Z"
          fill="url(#waterGradient)"
          opacity="0.85"
        />
        <path
          d="M 0 0 L 180 0 Q 240 160, 200 320 T 120 700 L 0 700 Z"
          fill="url(#waterGradient)"
          opacity="0.5"
        />

        {/* Stylized Arterials / Highway Grid Network */}
        <g stroke="#262c38" strokeWidth="4" strokeLinecap="round" fill="none">
          {/* Main Avenues */}
          <path d="M 0 150 Q 500 180, 1000 140" />
          <path d="M 0 350 Q 480 320, 1000 370" />
          <path d="M 0 520 Q 520 540, 1000 500" />
          {/* Major Crossings */}
          <path d="M 220 0 Q 240 350, 210 700" />
          <path d="M 450 0 Q 420 350, 480 700" />
          <path d="M 720 0 Q 690 350, 750 700" />
          {/* Diagonal Freeways */}
          <path d="M 120 700 Q 500 400, 850 50" stroke="#374151" strokeWidth="6" />
          <path d="M 80 100 Q 400 320, 920 620" stroke="#374151" strokeWidth="5" />
        </g>

        {/* Minor City Streets */}
        <g stroke="#1b202a" strokeWidth="2" fill="none">
          <path d="M 50 250 L 950 250" />
          <path d="M 50 440 L 950 440" />
          <path d="M 50 600 L 950 600" />
          <path d="M 330 50 L 330 650" />
          <path d="M 580 50 L 580 650" />
          <path d="M 830 50 L 830 650" />
        </g>

        {/* Active Route Curve */}
        <path
          d={`M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`}
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          className="drop-shadow-[0_0_12px_rgba(6,193,103,0.6)]"
        />

        {/* Dashed Navigation Tracking Guide */}
        <path
          d={`M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeDasharray="8 8"
          opacity="0.8"
        />

        {/* Pickup Pin Marker (Point A) */}
        <g transform={`translate(${startX}, ${startY})`}>
          <circle r="18" fill="#06c167" opacity="0.25" className="animate-ping" />
          <circle r="10" fill="#06c167" stroke="#ffffff" strokeWidth="2.5" />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill="#000000"
            fontSize="9"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            A
          </text>
        </g>

        {/* Dropoff Pin Marker (Point B) */}
        <g transform={`translate(${endX}, ${endY})`}>
          <circle r="16" fill="#ffffff" opacity="0.2" />
          <rect
            x="-9"
            y="-9"
            width="18"
            height="18"
            rx="3"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="2"
          />
          <text
            x="0"
            y="3.5"
            textAnchor="middle"
            fill="#000000"
            fontSize="9"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            B
          </text>
        </g>

        {/* Moving Vehicle Marker */}
        {(status === 'matched' || status === 'en_route') && (
          <g transform={`translate(${currentX}, ${currentY})`}>
            {/* Pulsing halo */}
            <circle r="22" fill="#06c167" opacity="0.3" className="animate-pulse" />
            <circle r="14" fill="#000000" stroke="#06c167" strokeWidth="3" />
            {/* Vehicle Icon representation */}
            <circle r="6" fill="#06c167" />
          </g>
        )}
      </svg>

      {/* Floating Status Pill over Map */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-700 text-xs font-semibold text-white flex items-center gap-2 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="capitalize font-bold">{service} Map Simulator</span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-300 text-[11px]">Live GPS Feed</span>
        </div>

        {driverName && (
          <div className="hidden sm:flex bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700 text-xs text-neutral-200 items-center gap-2 shadow-xl">
            {service === 'package' ? (
              <Package className="w-3.5 h-3.5 text-emerald-400" />
            ) : service === 'freight' ? (
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Car className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-semibold text-white">{driverName}</span>
            {driverPlate && <span className="text-neutral-400 text-[11px]">({driverPlate})</span>}
          </div>
        )}
      </div>

      {/* Floating Map Navigation Compass Widget */}
      <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-md p-2 rounded-full border border-neutral-800 text-neutral-400 shadow-xl">
        <Compass className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '30s' }} />
      </div>

      {/* Bottom overlay badge */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 flex items-center gap-2 shadow-lg">
          <span className="font-bold text-white">Route:</span>
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{pickupAddress}</span>
          <span className="text-emerald-400">→</span>
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{dropoffAddress}</span>
        </div>

        <div className="bg-emerald-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-700/60 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-lg">
          <Navigation className="w-3 h-3 text-emerald-400" />
          <span>{etaMinutes} min estimated</span>
        </div>
      </div>
    </div>
  );
}
