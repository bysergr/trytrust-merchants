import { EstimatedArrival } from '../types';

/**
 * Calculates estimated delivery arrival as a random moment within the next 4 hours
 * from the time of purchase: estimated_arrival_at = now + random(0, 4 hours).
 */
export function calculateEstimatedArrival(now: Date = new Date()): EstimatedArrival {
  // Random milliseconds between 15 minutes and 4 hours (to ensure a realistic positive window)
  const minMs = 15 * 60 * 1000;
  const maxMs = 4 * 60 * 60 * 1000;
  const randomOffsetMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  
  const arrivalDate = new Date(now.getTime() + randomOffsetMs);
  const minutesFromNow = Math.round((arrivalDate.getTime() - now.getTime()) / (60 * 1000));
  
  // Format human-readable string in English
  const hours = Math.floor(minutesFromNow / 60);
  const remainingMins = minutesFromNow % 60;
  const timeFormatted = arrivalDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  let relativeString = '';
  if (hours > 0) {
    relativeString = `${hours} hr ${remainingMins > 0 ? `${remainingMins} min` : ''}`.trim();
  } else {
    relativeString = `${remainingMins} minutes`;
  }

  const formatted = `Arrives in ~${relativeString} (Today by ${timeFormatted})`;

  return {
    iso: arrivalDate.toISOString(),
    formatted,
    minutes_from_now: minutesFromNow,
  };
}
