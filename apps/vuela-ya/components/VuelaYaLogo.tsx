import React from 'react';

interface VuelaYaLogoProps {
  className?: string;
  size?: number;
}

export function VuelaYaLogo({ className = 'size-8', size = 32 }: VuelaYaLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vuela Ya Colombian Domestic Airline Logo"
    >
      {/* Background Rounded Shield / Emblem */}
      <rect width="48" height="48" rx="12" fill="#E01E26" />

      {/* Aerodynamic Geometric Avian Wing Fins / Soaring Condor Silhouette */}
      <path
        d="M10 33.5C18 33.5 28.5 29 38 14C31 22 21 26.5 10 27.5V33.5Z"
        fill="white"
      />
      <path
        d="M13 24C20.5 23.5 29.5 19.5 37 9C31 15 22 18.5 13 19V24Z"
        fill="#FFD2D5"
      />
      <path
        d="M16 16C23 15 30 11.5 36 5C31.5 9.5 24 12 16 12.5V16Z"
        fill="white"
      />
      {/* Front Dynamic Aero Fin */}
      <circle cx="38" cy="14" r="2.5" fill="#FFE5E7" />
    </svg>
  );
}

export function VuelaYaBrand({ showTagline = true }: { showTagline?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <VuelaYaLogo size={38} className="size-9.5 shrink-0 shadow-md shadow-red-950/20" />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-[#E01E26] dark:text-red-500">
            VUELA YA
          </span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#C0181E] dark:bg-red-950/80 dark:text-red-300">
            Colombia
          </span>
        </div>
        {showTagline && (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Domestic Skyways • 100% Colombian Routes
          </p>
        )}
      </div>
    </div>
  );
}
