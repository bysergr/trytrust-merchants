import { QuoteInput, QuoteResult } from '../types';
import { getVehicleTypeById } from './vehicles';

// Standard known reference landmarks across Bogotá, Colombia
export const BOGOTA_PRESET_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  'el dorado': { lat: 4.7016, lng: -74.1469, name: 'Aeropuerto El Dorado (BOG)' },
  'aeropuerto': { lat: 4.7016, lng: -74.1469, name: 'Aeropuerto El Dorado' },
  'parque 93': { lat: 4.6768, lng: -74.0536, name: 'Parque de la 93 (Chicó)' },
  'chico': { lat: 4.6768, lng: -74.0536, name: 'Chicó Norte' },
  'zona t': { lat: 4.6669, lng: -74.0531, name: 'Zona T / Andino' },
  'zona rosa': { lat: 4.6669, lng: -74.0531, name: 'Zona Rosa' },
  'andino': { lat: 4.6669, lng: -74.0531, name: 'Centro Comercial Andino' },
  'chapinero': { lat: 4.6486, lng: -74.0628, name: 'Chapinero Alto' },
  'colpatria': { lat: 4.6144, lng: -74.0694, name: 'Torre Colpatria / Centro Internacional' },
  'centro internacional': { lat: 4.6144, lng: -74.0694, name: 'Centro Internacional' },
  'candelaria': { lat: 4.5981, lng: -74.0760, name: 'La Candelaria / Plaza de Bolívar' },
  'plaza bolivar': { lat: 4.5981, lng: -74.0760, name: 'Plaza de Bolívar' },
  'unicentro': { lat: 4.7022, lng: -74.0416, name: 'Unicentro Bogotá (Usaquén)' },
  'usaquen': { lat: 4.6975, lng: -74.0322, name: 'Parque de Usaquén' },
  'cedritos': { lat: 4.7231, lng: -74.0385, name: 'Cedritos (Calle 140)' },
  'suba': { lat: 4.7450, lng: -74.0920, name: 'Suba Centro' },
  'corferias': { lat: 4.6318, lng: -74.0924, name: 'Corferias Bogotá' },
  'salitre': { lat: 4.6468, lng: -74.1084, name: 'Ciudad Salitre / Gran Estación' },
  'gran estacion': { lat: 4.6468, lng: -74.1084, name: 'Centro Comercial Gran Estación' },
  'fontibon': { lat: 4.6825, lng: -74.1534, name: 'Zona Franca Fontibón' },
  'zona franca': { lat: 4.6825, lng: -74.1534, name: 'Zona Franca Bogotá' },
  'siberia': { lat: 4.7431, lng: -74.1542, name: 'Parque Industrial Siberia (Cota)' },
  'funza': { lat: 4.7150, lng: -74.2100, name: 'Funza Hub Logístico' },
  'calle 100': { lat: 4.6865, lng: -74.0578, name: 'Calle 100 con Carrera 15' },
  'calle 26': { lat: 4.6542, lng: -74.1022, name: 'Avenida Calle 26 (El Dorado)' },
  'calle 72': { lat: 4.6565, lng: -74.0588, name: 'Calle 72 / Distrito Financiero' },
  'calle 170': { lat: 4.7520, lng: -74.0450, name: 'Calle 170 con Autopista Norte' },
  'monserrate': { lat: 4.6056, lng: -74.0555, name: 'Cerro de Monserrate' },
  'default': { lat: 4.6500, lng: -74.0800, name: 'Bogotá D.C. Centro Metropolitano' },
};

/**
 * Intelligent parser for Bogotá's street grid system (Calles run East-West, Carreras run North-South).
 * Examples: "Calle 140 # 11-45", "Cra 15 # 85-30", "Cl 26 con Cra 68", "Av 68 con Calle 53".
 */
export function parseBogotaStreetGrid(address: string): { lat: number; lng: number } | null {
  const norm = address.toLowerCase();

  // Regex to extract Calle (Cl, Cll, Calle, Diagonal, Dg) and Carrera (Cra, Cr, Carrera, Transversal, Tv, Ak, Kr)
  const calleMatch = norm.match(/(?:calle|cll|cl|diagonal|dg)\.?\s*(\d{1,3})/i);
  const craMatch = norm.match(/(?:carrera|cra|cr|kr|transversal|tv|ak|avenida|av)\.?\s*(\d{1,3})/i);

  if (calleMatch || craMatch) {
    const calleNum = calleMatch ? parseInt(calleMatch[1], 10) : 72; // default Calle 72
    const craNum = craMatch ? parseInt(craMatch[1], 10) : 15; // default Carrera 15

    // Bogotá grid coordinate formulas:
    // Calles: Calle 1 ~ 4.590, Calle 100 ~ 4.686, Calle 200 ~ 4.780
    const lat = 4.590 + (Math.min(220, Math.max(1, calleNum)) / 200) * 0.190;

    // Carreras: Cra 1 ~ -74.040, Cra 30 ~ -74.080, Cra 68 ~ -74.110, Cra 100 ~ -74.150
    const lng = -74.040 - (Math.min(130, Math.max(1, craNum)) / 120) * 0.125;

    return {
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    };
  }

  return null;
}

export function estimateCoordinates(
  address: string,
  customLat?: number | null,
  customLng?: number | null
): { lat: number; lng: number } {
  // If custom coordinates are explicitly provided, respect them directly
  if (typeof customLat === 'number' && typeof customLng === 'number' && !isNaN(customLat) && !isNaN(customLng)) {
    return { lat: customLat, lng: customLng };
  }

  if (!address || !address.trim()) {
    return BOGOTA_PRESET_LOCATIONS.default;
  }

  const lower = address.toLowerCase();

  // 1. Check known landmarks first
  for (const [key, loc] of Object.entries(BOGOTA_PRESET_LOCATIONS)) {
    if (lower.includes(key)) {
      return { lat: loc.lat, lng: loc.lng };
    }
  }

  // 2. Try Bogotá street grid regex parser
  const parsedGrid = parseBogotaStreetGrid(address);
  if (parsedGrid) {
    return parsedGrid;
  }

  // 3. Deterministic offset within Bogotá urban bounds for arbitrary user strings
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 140) - 70) / 1000;
  const lngOffset = ((Math.abs(hash >> 3) % 120) - 60) / 1000;

  return {
    lat: Math.round((BOGOTA_PRESET_LOCATIONS.default.lat + latOffset) * 10000) / 10000,
    lng: Math.round((BOGOTA_PRESET_LOCATIONS.default.lng + lngOffset) * 10000) / 10000,
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
  const R = 6371; // Earth radius in km
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

  // Road factor for urban grid topology
  const roadDist = rawDist * 1.38;

  if (roadDist >= 0.8) {
    return Math.round(roadDist * 10) / 10;
  }

  if (pickupAddress && dropoffAddress) {
    let hash = 0;
    const combined = `${pickupAddress}->${dropoffAddress}`;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    const derivedKm = 3.5 + (Math.abs(hash) % 95) / 10;
    return Math.round(derivedKm * 10) / 10;
  }

  return 4.5;
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

  const pickupCoords = estimateCoordinates(input.pickup_address, input.pickup_lat, input.pickup_lng);
  const dropoffCoords = estimateCoordinates(input.dropoff_address, input.dropoff_lat, input.dropoff_lng);

  const distanceKm = calculateDistanceKm(
    pickupCoords.lat,
    pickupCoords.lng,
    dropoffCoords.lat,
    dropoffCoords.lng,
    input.pickup_address,
    input.dropoff_address
  );

  const tripDurationMinutes = Math.max(8, Math.round(distanceKm * 2.4));
  const pickupEtaMinutes = vehicle.eta_minutes_base || 4;
  const totalDurationMinutes = pickupEtaMinutes + tripDurationMinutes;

  let weightSurcharge = 0;
  if (input.service === 'package' && input.package_weight_kg && input.package_weight_kg > 5) {
    weightSurcharge = (input.package_weight_kg - 5) * 1200;
  } else if (input.service === 'freight' && input.cargo_weight_kg && input.cargo_weight_kg > 500) {
    weightSurcharge = ((input.cargo_weight_kg - 500) / 100) * 4500;
  }

  const distanceFare = Math.round(distanceKm * vehicle.per_km_rate);
  const totalPrice = Math.round(vehicle.base_fare + distanceFare + weightSurcharge);

  const now = new Date();
  const scheduledDate = input.scheduled_at ? new Date(input.scheduled_at) : null;
  const baseTime = scheduledDate && scheduledDate.getTime() > now.getTime() ? scheduledDate : now;
  const estimatedArrival = new Date(baseTime.getTime() + totalDurationMinutes * 60 * 1000);

  return {
    service: input.service,
    vehicle_type: vehicle,
    pickup_address: input.pickup_address,
    dropoff_address: input.dropoff_address,
    pickup_coords: pickupCoords,
    dropoff_coords: dropoffCoords,
    distance_km: distanceKm,
    duration_minutes: totalDurationMinutes,
    base_fare: vehicle.base_fare,
    distance_fare: distanceFare,
    weight_surcharge: Math.round(weightSurcharge),
    total_price: totalPrice,
    estimated_arrival_at: estimatedArrival.toISOString(),
    estimated_duration_text: `${pickupEtaMinutes} min pickup (${totalDurationMinutes} min trip)`,
    scheduled_at: input.scheduled_at || null,
    is_available: vehicle.count_available > 0,
    vehicles_remaining: vehicle.count_available,
  };
}
