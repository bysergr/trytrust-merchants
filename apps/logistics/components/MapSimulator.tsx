'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Navigation, Car, Package, Truck, Compass, MousePointerClick } from 'lucide-react';
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
  onMapClickLocation?: (type: 'pickup' | 'dropoff', coords: { lat: number; lng: number }, address: string) => void;
}

export function generateBogotaAddressFromCoords(lat: number, lng: number): string {
  const calleNum = Math.round(((lat - 4.590) / 0.190) * 200);
  const craNum = Math.round(((-74.040 - lng) / 0.125) * 120);

  const safeCalle = Math.max(1, Math.min(220, calleNum));
  const safeCra = Math.max(1, Math.min(130, craNum));

  let sector = 'Bogotá';
  if (safeCalle > 140) sector = 'Cedritos, Usaquén';
  else if (safeCalle > 90) sector = 'Chicó / Parque 93';
  else if (safeCalle > 70) sector = 'Zona T / Andino';
  else if (safeCalle > 50) sector = 'Chapinero';
  else if (safeCalle > 20) sector = 'Centro Internacional';
  else sector = 'La Candelaria / Centro';

  if (safeCra > 90) sector = 'Fontibón / Occidente';
  else if (safeCra > 65) sector = 'Salitre / Av 68';

  return `Calle ${safeCalle} # ${safeCra}-${Math.floor(Math.random() * 80 + 12)}, ${sector}`;
}

export function MapSimulator({
  service = 'ride',
  status,
  pickupAddress = 'Parque de la 93, Bogotá',
  dropoffAddress = 'Aeropuerto El Dorado, Bogotá',
  pickupCoords = { lat: 4.6768, lng: -74.0536 },
  dropoffCoords = { lat: 4.7016, lng: -74.1469 },
  driverName,
  driverPlate,
  etaMinutes = 6,
  onMapClickLocation,
}: MapSimulatorProps) {
  const [vehicleProgress, setVehicleProgress] = useState(0.2);
  const [pinMode, setPinMode] = useState<'pickup' | 'dropoff'>('pickup');
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Animate vehicle movement when active
  useEffect(() => {
    if (status === 'matched' || status === 'en_route') {
      const interval = setInterval(() => {
        setVehicleProgress((prev) => {
          const next = prev + 0.035;
          return next > 0.95 ? 0.05 : next;
        });
      }, 700);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Coordinate projections for Bogotá metropolitan area
  const projectX = (lng: number) => {
    const minLng = -74.18;
    const maxLng = -74.02;
    return Math.max(80, Math.min(920, ((lng - minLng) / (maxLng - minLng)) * 780 + 100));
  };

  const projectY = (lat: number) => {
    const minLat = 4.56;
    const maxLat = 4.76;
    return Math.max(70, Math.min(630, 700 - (((lat - minLat) / (maxLat - minLat)) * 540 + 80)));
  };

  // Inverse projection from SVG (x, y) to real-world Bogotá (lat, lng)
  const inverseCoords = (svgX: number, svgY: number) => {
    const minLng = -74.18;
    const maxLng = -74.02;
    const minLat = 4.56;
    const maxLat = 4.76;

    const lng = minLng + ((svgX - 100) / 780) * (maxLng - minLng);
    const lat = minLat + ((700 - svgY - 80) / 540) * (maxLat - minLat);

    return {
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    };
  };

  const startX = projectX(pickupCoords.lng);
  const startY = projectY(pickupCoords.lat);
  const endX = projectX(dropoffCoords.lng);
  const endY = projectY(dropoffCoords.lat);

  // Bezier curve control points
  const midX = (startX + endX) / 2 + (endY - startY) * 0.16;
  const midY = (startY + endY) / 2 - (endX - startX) * 0.16;

  // Quadratic Bezier interpolation for vehicle position
  const t = status === 'completed' ? 1.0 : status === 'matched' ? 0.15 : vehicleProgress;
  const currentX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
  const currentY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMapClickLocation || status) return; // only allow clicking in booking state

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 700 / rect.height;

    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    setClickRipple({ x: svgX, y: svgY });
    setTimeout(() => setClickRipple(null), 800);

    const coords = inverseCoords(svgX, svgY);
    const newAddress = generateBogotaAddressFromCoords(coords.lat, coords.lng);

    onMapClickLocation(pinMode, coords, newAddress);
  };

  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[580px] bg-neutral-950 overflow-hidden select-none border-l border-neutral-800">
      {/* SVG Map Canvas */}
      <svg
        ref={svgRef}
        onClick={handleSvgClick}
        className={`w-full h-full absolute inset-0 object-cover ${
          onMapClickLocation && !status ? 'cursor-crosshair' : 'cursor-default'
        }`}
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06c167" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="mountainsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#131c15" />
            <stop offset="100%" stopColor="#0a120c" />
          </linearGradient>
          <linearGradient id="airportAreaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18202c" />
            <stop offset="100%" stopColor="#0f1622" />
          </linearGradient>
          <pattern id="bogotaGrid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#1c212b" strokeWidth="0.65" />
          </pattern>
        </defs>

        {/* Base Map Surfaces */}
        <rect width="1000" height="700" fill="#0d0f14" />
        <rect width="1000" height="700" fill="url(#bogotaGrid)" />

        {/* Cerros Orientales (Eastern Mountains Ridge) */}
        <path
          d="M 800 0 Q 750 200, 780 400 T 730 700 L 1000 700 L 1000 0 Z"
          fill="url(#mountainsGradient)"
          stroke="#1b2a1e"
          strokeWidth="1.5"
        />

        {/* Mountain Contour Lines */}
        <g stroke="#26382a" strokeWidth="1" fill="none" opacity="0.6">
          <path d="M 840 0 Q 800 240, 830 450 T 790 700" />
          <path d="M 890 0 Q 860 260, 880 500 T 850 700" />
          <path d="M 940 0 Q 920 280, 930 520 T 910 700" />
        </g>

        {/* Monserrate & Guadalupe Mountain Labels */}
        <g opacity="0.75">
          <circle cx="830" cy="500" r="4" fill="#06c167" opacity="0.8" />
          <text x="840" y="504" fill="#86efac" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
            ▲ Monserrate (3,152m)
          </text>

          <circle cx="810" cy="580" r="4" fill="#06c167" opacity="0.8" />
          <text x="820" y="584" fill="#86efac" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            ▲ Guadalupe (3,250m)
          </text>
        </g>

        {/* Aeropuerto El Dorado West Zone Polygon & Runway */}
        <g opacity="0.9">
          <rect x="80" y="180" width="180" height="120" rx="14" fill="url(#airportAreaGradient)" stroke="#27354a" strokeWidth="1.5" />
          <line x1="100" y1="210" x2="240" y2="270" stroke="#475569" strokeWidth="6" strokeDasharray="14 6" />
          <line x1="110" y1="195" x2="230" y2="245" stroke="#334155" strokeWidth="4" strokeDasharray="10 4" />
          <text x="110" y="290" fill="#94a3b8" fontSize="10" fontWeight="extrabold" fontFamily="sans-serif">
            ✈ Aeropuerto El Dorado (BOG)
          </text>
        </g>

        {/* Parque Simón Bolívar & Salitre Park */}
        <rect x="420" y="320" width="100" height="70" rx="12" fill="#142419" stroke="#1f3b27" strokeWidth="1" />
        <text x="430" y="360" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="sans-serif" opacity="0.8">
          🌳 Parque Simón Bolívar
        </text>

        {/* Major Arterials Network */}
        <g stroke="#2d3545" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M 120 240 Q 450 340, 770 480" stroke="#38445a" strokeWidth="7" />
          <path d="M 740 0 Q 720 300, 760 700" stroke="#38445a" strokeWidth="7" />
          <path d="M 660 0 Q 640 300, 680 700" />
          <path d="M 80 120 Q 400 130, 740 140" stroke="#38445a" strokeWidth="6" />
          <path d="M 80 380 Q 420 360, 760 380" stroke="#38445a" strokeWidth="6" />
          <path d="M 280 0 Q 300 350, 260 700" />
          <path d="M 440 0 Q 460 350, 420 700" />
          <path d="M 540 0 Q 560 350, 520 700" stroke="#38445a" strokeWidth="6" />
          <path d="M 360 0 Q 380 350, 340 700" />
        </g>

        {/* Arterial Road Names */}
        <g fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="sans-serif" opacity="0.6">
          <text x="480" y="325" transform="rotate(15 480 325)">Av. Calle 26 (El Dorado)</text>
          <text x="735" y="160" transform="rotate(85 735 160)">Cra 7 / Autonorte</text>
          <text x="535" y="200" transform="rotate(85 535 200)">Av. NQS / Cra 30</text>
          <text x="275" y="160" transform="rotate(85 275 160)">Av. Boyacá</text>
        </g>

        {/* Active Route Curve Between Custom Pickup and Dropoff */}
        <path
          d={`M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`}
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="6.5"
          strokeLinecap="round"
          className="drop-shadow-[0_0_15px_rgba(6,193,103,0.7)]"
        />

        <path
          d={`M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeDasharray="9 9"
          opacity="0.85"
        />

        {/* Click Ripple Indicator */}
        {clickRipple && (
          <g transform={`translate(${clickRipple.x}, ${clickRipple.y})`}>
            <circle r="30" fill="none" stroke="#06c167" strokeWidth="3" className="animate-ping" />
            <circle r="8" fill="#06c167" />
          </g>
        )}

        {/* Pickup Pin Marker (Point A) */}
        <g transform={`translate(${startX}, ${startY})`}>
          <circle r="20" fill="#06c167" opacity="0.22" className="animate-ping" />
          <circle r="11" fill="#06c167" stroke="#ffffff" strokeWidth="2.5" />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#000000"
            fontSize="10"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            A
          </text>
        </g>

        {/* Dropoff Pin Marker (Point B) */}
        <g transform={`translate(${endX}, ${endY})`}>
          <circle r="18" fill="#ffffff" opacity="0.18" />
          <rect
            x="-10"
            y="-10"
            width="20"
            height="20"
            rx="4"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="2.5"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#000000"
            fontSize="10"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            B
          </text>
        </g>

        {/* Animated Vehicle Marker */}
        {(status === 'matched' || status === 'en_route') && (
          <g transform={`translate(${currentX}, ${currentY})`}>
            <circle r="24" fill="#06c167" opacity="0.25" className="animate-pulse" />
            <circle r="15" fill="#000000" stroke="#06c167" strokeWidth="3" />
            <circle r="6" fill="#06c167" />
          </g>
        )}
      </svg>

      {/* Top Floating Header & Pin Selector Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-700 text-xs font-bold text-white flex items-center gap-2 shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="capitalize font-black tracking-tight">Bogotá Metro Feed</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-300 text-[11px] font-mono">2,600m</span>
        </div>

        {/* Interactive Click-to-Pin Mode Switcher */}
        {onMapClickLocation && !status && (
          <div className="bg-neutral-900/90 backdrop-blur-md p-1 rounded-full border border-neutral-700 flex items-center gap-1 shadow-2xl">
            <button
              type="button"
              onClick={() => setPinMode('pickup')}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                pinMode === 'pickup'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-black" />
              Set Pickup (A)
            </button>
            <button
              type="button"
              onClick={() => setPinMode('dropoff')}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                pinMode === 'dropoff'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <div className="w-2 h-2 rounded-sm bg-black" />
              Set Dropoff (B)
            </button>
          </div>
        )}

        {driverName && (
          <div className="hidden sm:flex bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700 text-xs text-neutral-200 items-center gap-2 shadow-2xl">
            {service === 'package' ? (
              <Package className="w-3.5 h-3.5 text-emerald-400" />
            ) : service === 'freight' ? (
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Car className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-extrabold text-white">{driverName}</span>
            {driverPlate && <span className="text-neutral-400 text-[11px] font-mono">({driverPlate})</span>}
          </div>
        )}
      </div>

      {/* Top Right Live Compass */}
      <div className="absolute top-4 right-4 z-20 bg-black/85 backdrop-blur-md p-2 rounded-full border border-neutral-800 text-neutral-400 shadow-xl">
        <Compass className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '40s' }} />
      </div>

      {/* Floating Interactive Help Banner */}
      {onMapClickLocation && !status && (
        <div className="absolute top-16 right-4 z-20 hidden md:flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
          <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" />
          <span>Click anywhere on the map to set custom {pinMode} point</span>
        </div>
      )}

      {/* Bottom Floating Route Pill */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
        <div className="bg-black/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2 shadow-2xl">
          <span className="font-extrabold text-white">Route:</span>
          <span className="truncate max-w-[120px] sm:max-w-[180px] text-neutral-200">{pickupAddress}</span>
          <span className="text-emerald-400 font-bold">→</span>
          <span className="truncate max-w-[120px] sm:max-w-[180px] text-neutral-200">{dropoffAddress}</span>
        </div>

        <div className="bg-emerald-950/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-700/80 text-xs font-black text-emerald-300 flex items-center gap-1.5 shadow-2xl">
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>{etaMinutes} min ETA</span>
        </div>
      </div>
    </div>
  );
}
