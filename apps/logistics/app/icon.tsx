import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          borderRadius: '8px',
          border: '1px solid #262626',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="26"
          height="26"
          fill="none"
        >
          {/* Top Mobility Vector */}
          <polygon
            points="50,10 88,32 50,54 12,32"
            fill="#ffffff"
            opacity="0.95"
          />
          {/* Bottom Right Vector */}
          <polygon
            points="50,54 88,32 88,76 50,98"
            fill="#06c167"
          />
          {/* Bottom Left Vector */}
          <polygon
            points="50,54 12,32 12,76 50,98"
            fill="#10b981"
            opacity="0.9"
          />
          {/* Central Nexus Core Node */}
          <circle cx="50" cy="54" r="8" fill="#000000" stroke="#06c167" strokeWidth="3" />
          <circle cx="50" cy="54" r="3.5" fill="#ffffff" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
