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
          background: '#E01E26',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
          <circle cx="38" cy="14" r="2.5" fill="#FFE5E7" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
