import { QuoteInput, QuoteResult } from '../types';
import { getVehicleTypeById } from './vehicles';

// Standard known reference locations for realistic coordinate defaults
const PRESET_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // San Francisco & Bay Area
  'downtown': { lat: 37.7857, lng: -122.4064 },
  'market': { lat: 37.7857, lng: -122.4064 },
  'pier 39': { lat: 37.8087, lng: -122.4098 },
  'sfo': { lat: 37.6213, lng: -122.3790 },
  'airport': { lat: 37.6213, lng: -122.3790 },
  'mission': { lat: 37.7599, lng: -122.4148 },
  'soma': { lat: 37.7785, lng: -122.3990 },
  'oakland': { lat: 37.8044, lng: -122.2712 },
  'san jose': { lat: 37.3382, lng: -121.8863 },
  'berkeley': { lat: 37.8715, lng: -122.2730 },
  'palo alto': { lat: 37.4419, lng: -122.1430 },
  // General fallback city center
  'default': { lat: 37.7749, lng: -122.4194 },
};

export function estimateCoordinates(address: string): { lat: number; lng: number } {
  const lower = address.toLowerCase();
  for (const [key, coords] of Object.entries(PRESET_LOCATIONS)) {
    if (lower.includes(key)) {
      return coords;
    }
  }

  // Deterministic offset based on string hash for realistic visual placement on map
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) / 1000;
  const lngOffset = ((Math.abs(hash >> 3) % 100) - 50) / 1000;

  return {
    lat: PRESET_LOCATIONS.default.lat + latOffset,
    lng: PRESET_LOCATIONS.default.lng + lngOffset,
  };
}

export function calculateDistanceKm(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  pickupAddress?: string,
  dropoffAddress?: string
): number {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = ((dropoffLat - pickupLat) * Math.PI) / 180;
  const dLng = ((dropoffLng - pickupLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pickupLat * Math.PI) / 180) *
      Math.cos((dropoffLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDist = R * c;

  // Road factor multiplier (roads are not straight lines)
  const roadDist = rawDist * 1.35;

  if (roadDist >= 0.8) {
    return Math.round(roadDist * 10) / 10;
  }

  // If coordinates are nearly identical, calculate deterministic realistic distance from addresses
  if (pickupAddress && dropoffAddress) {
    let hash = 0;
    const combined = `${pickupAddress}->${dropoffAddress}`;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    const derivedKm = 2.5 + (Math.abs(hash) % 85) / 10; // between 2.5 and 11 km
    return Math.round(derivedKm * 10) / 10;
  }

  return 3.2; // default fallback 3.2 km
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const vehicle = getVehicleTypeById(input.vehicle_type_id);
  if (!vehicle) {
    throw new Error(`Vehicle type "${input.vehicle_type_id}" not found`);
  }

  if (vehicle.service !== input.service) {
    throw new Error(
      `Vehicle type "${vehicle.name}" belongs to service "${vehicle.service}", but quote requested for "${input.service}"`
    );
  }

  const pickupCoords = estimateCoordinates(input.pickup_address);
  const dropoffCoords = estimateCoordinates(input.dropoff_address);
  const distanceKm = calculateDistanceKm(
    pickupCoords.lat,
    pickupCoords.lng,
    dropoffCoords.lat,
    dropoffCoords.lng,
    input.pickup_address,
    input.dropoff_address
  );

  // Speed assumptions: average city speed 25-35 km/h -> ~2.2 mins per km
  const tripDurationMinutes = Math.max(5, Math.round(distanceKm * 2.2));
  const pickupEtaMinutes = vehicle.eta_minutes_base || 5;
  const totalDurationMinutes = pickupEtaMinutes + tripDurationMinutes;

  // Weight surcharge
  let weightSurcharge = 0;
  if (input.service === 'package' && input.package_weight_kg && input.package_weight_kg > 5) {
    weightSurcharge = (input.package_weight_kg - 5) * 0.75;
  } else if (input.service === 'freight' && input.cargo_weight_kg && input.cargo_weight_kg > 500) {
    weightSurcharge = ((input.cargo_weight_kg - 500) / 100) * 2.5;
  }

  const distanceFare = Math.round(distanceKm * vehicle.per_km_rate * 100) / 100;
  const totalPrice = Math.round((vehicle.base_fare + distanceFare + weightSurcharge) * 100) / 100;

  const now = new Date();
  const scheduledDate = input.scheduled_at ? new Date(input.scheduled_at) : null;
  const baseTime = scheduledDate && scheduledDate.getTime() > now.getTime() ? scheduledDate : now;
  const estimatedArrival = new Date(baseTime.getTime() + totalDurationMinutes * 60 * 1000);

  return {
    service: input.service,
    vehicle_type: vehicle,
    pickup_address: input.pickup_address,
    dropoff_address: input.dropoff_address,
    distance_km: distanceKm,
    duration_minutes: totalDurationMinutes,
    base_fare: vehicle.base_fare,
    distance_fare: distanceFare,
    weight_surcharge: Math.round(weightSurcharge * 100) / 100,
    total_price: totalPrice,
    estimated_arrival_at: estimatedArrival.toISOString(),
    estimated_duration_text: `${pickupEtaMinutes} min pickup (${totalDurationMinutes} min total)`,
    scheduled_at: input.scheduled_at || null,
    is_available: vehicle.count_available > 0,
    vehicles_remaining: vehicle.count_available,
  };
}
