import { getDatabase } from '../db';
import {
  FlightDetailsResult,
  FlightSearchResult,
  SearchFlightsParams,
  CabinClass,
} from '../types';
import { validateAirportCode } from './airports';
import { expireStaleHolds } from './expiration';

export function listAllFlights(options?: {
  limit?: number;
  cabin_class?: CabinClass;
}): FlightSearchResult[] {
  expireStaleHolds();
  const db = getDatabase();

  const limit = options?.limit || 60;
  const targetCabin = options?.cabin_class?.toLowerCase() as CabinClass | undefined;

  const query = `
    SELECT 
      f.id,
      f.flight_number,
      f.origin_airport_code AS origin,
      orig.city AS origin_city,
      f.destination_airport_code AS destination,
      dest.city AS destination_city,
      f.departure_at,
      f.arrival_at,
      f.duration_minutes,
      f.base_price_economy,
      f.base_price_business,
      f.aircraft_type,
      COUNT(CASE WHEN s.status = 'available' THEN 1 END) AS seats_remaining,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'economy' THEN 1 END) AS economy_seats_remaining,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'business' THEN 1 END) AS business_seats_remaining
    FROM flights f
    JOIN airports orig ON f.origin_airport_code = orig.code
    JOIN airports dest ON f.destination_airport_code = dest.code
    LEFT JOIN seats s ON f.id = s.flight_id
    WHERE datetime(f.departure_at) >= datetime('now', '-2 hours')
    GROUP BY f.id
    ORDER BY f.departure_at ASC
    LIMIT ?
  `;

  interface FlightRow {
    id: string;
    flight_number: string;
    origin: string;
    origin_city: string;
    destination: string;
    destination_city: string;
    departure_at: string;
    arrival_at: string;
    duration_minutes: number;
    base_price_economy: number;
    base_price_business: number;
    aircraft_type: string;
    seats_remaining: number;
    economy_seats_remaining: number;
    business_seats_remaining: number;
  }

  const rows = db.prepare(query).all(limit) as FlightRow[];
  const results: FlightSearchResult[] = [];

  for (const row of rows) {
    const ecoSeats = row.economy_seats_remaining;
    const busSeats = row.business_seats_remaining;
    const totalSeats = row.seats_remaining;

    if (targetCabin === 'economy' && ecoSeats < 1) continue;
    if (targetCabin === 'business' && busSeats < 1) continue;

    const availableCabinClasses: CabinClass[] = [];
    if (ecoSeats >= 1) availableCabinClasses.push('economy');
    if (busSeats >= 1) availableCabinClasses.push('business');

    let displayPrice = row.base_price_economy;
    if (targetCabin === 'business') {
      displayPrice = row.base_price_business;
    } else if (targetCabin === 'economy') {
      displayPrice = row.base_price_economy;
    } else {
      displayPrice = ecoSeats >= 1 ? row.base_price_economy : row.base_price_business;
    }

    results.push({
      id: row.id,
      flight_number: row.flight_number,
      origin: row.origin,
      origin_city: row.origin_city,
      destination: row.destination,
      destination_city: row.destination_city,
      departure_at: row.departure_at,
      arrival_at: row.arrival_at,
      duration_minutes: row.duration_minutes,
      price: displayPrice,
      base_price_economy: row.base_price_economy,
      base_price_business: row.base_price_business,
      aircraft_type: row.aircraft_type,
      seats_remaining: totalSeats,
      economy_seats_remaining: ecoSeats,
      business_seats_remaining: busSeats,
      cabin_classes: availableCabinClasses,
    });
  }

  return results;
}

export function searchFlights(params: SearchFlightsParams): FlightSearchResult[] {
  const origin = validateAirportCode(params.origin);
  const destination = validateAirportCode(params.destination);

  if (origin === destination) {
    throw new Error('Origin and destination airports must be different.');
  }

  if (!params.departure_date) {
    throw new Error('Departure date is required (YYYY-MM-DD).');
  }

  // Ensure lazy expiration before querying availability
  expireStaleHolds();

  const db = getDatabase();

  // Normalize date string: YYYY-MM-DD
  const dateStr = params.departure_date.trim().substring(0, 10);

  const query = `
    SELECT 
      f.id,
      f.flight_number,
      f.origin_airport_code AS origin,
      orig.city AS origin_city,
      f.destination_airport_code AS destination,
      dest.city AS destination_city,
      f.departure_at,
      f.arrival_at,
      f.duration_minutes,
      f.base_price_economy,
      f.base_price_business,
      f.aircraft_type,
      COUNT(CASE WHEN s.status = 'available' THEN 1 END) AS seats_remaining,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'economy' THEN 1 END) AS economy_seats_remaining,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'business' THEN 1 END) AS business_seats_remaining
    FROM flights f
    JOIN airports orig ON f.origin_airport_code = orig.code
    JOIN airports dest ON f.destination_airport_code = dest.code
    LEFT JOIN seats s ON f.id = s.flight_id
    WHERE f.origin_airport_code = ?
      AND f.destination_airport_code = ?
      AND date(f.departure_at) = date(?)
    GROUP BY f.id
    ORDER BY f.departure_at ASC
  `;

  interface FlightRow {
    id: string;
    flight_number: string;
    origin: string;
    origin_city: string;
    destination: string;
    destination_city: string;
    departure_at: string;
    arrival_at: string;
    duration_minutes: number;
    base_price_economy: number;
    base_price_business: number;
    aircraft_type: string;
    seats_remaining: number;
    economy_seats_remaining: number;
    business_seats_remaining: number;
  }

  const rows = db.prepare(query).all(origin, destination, dateStr) as FlightRow[];

  const passengers = Math.max(1, params.passengers || 1);
  const targetCabin = params.cabin_class?.toLowerCase() as CabinClass | undefined;

  const results: FlightSearchResult[] = [];

  for (const row of rows) {
    const ecoSeats = row.economy_seats_remaining;
    const busSeats = row.business_seats_remaining;
    const totalSeats = row.seats_remaining;

    // Filter by cabin class if requested
    if (targetCabin === 'economy' && ecoSeats < passengers) {
      continue;
    }
    if (targetCabin === 'business' && busSeats < passengers) {
      continue;
    }
    if (!targetCabin && totalSeats < passengers) {
      continue;
    }

    const availableCabinClasses: CabinClass[] = [];
    if (ecoSeats >= passengers) availableCabinClasses.push('economy');
    if (busSeats >= passengers) availableCabinClasses.push('business');

    // Display price: if cabin specified use that, otherwise lowest available
    let displayPrice = row.base_price_economy;
    if (targetCabin === 'business') {
      displayPrice = row.base_price_business;
    } else if (targetCabin === 'economy') {
      displayPrice = row.base_price_economy;
    } else {
      displayPrice = ecoSeats >= passengers ? row.base_price_economy : row.base_price_business;
    }

    results.push({
      id: row.id,
      flight_number: row.flight_number,
      origin: row.origin,
      origin_city: row.origin_city,
      destination: row.destination,
      destination_city: row.destination_city,
      departure_at: row.departure_at,
      arrival_at: row.arrival_at,
      duration_minutes: row.duration_minutes,
      price: displayPrice,
      base_price_economy: row.base_price_economy,
      base_price_business: row.base_price_business,
      aircraft_type: row.aircraft_type,
      seats_remaining: totalSeats,
      economy_seats_remaining: ecoSeats,
      business_seats_remaining: busSeats,
      cabin_classes: availableCabinClasses,
    });
  }

  return results;
}

export function compareFlights(flightIds: string[]): FlightSearchResult[] {
  if (!flightIds || !Array.isArray(flightIds) || flightIds.length < 2 || flightIds.length > 4) {
    throw new Error('Please provide 2 to 4 flight IDs to compare.');
  }

  expireStaleHolds();
  const db = getDatabase();

  const placeholders = flightIds.map(() => '?').join(',');
  const query = `
    SELECT 
      f.id,
      f.flight_number,
      f.origin_airport_code AS origin,
      orig.city AS origin_city,
      f.destination_airport_code AS destination,
      dest.city AS destination_city,
      f.departure_at,
      f.arrival_at,
      f.duration_minutes,
      f.base_price_economy,
      f.base_price_business,
      f.aircraft_type,
      COUNT(CASE WHEN s.status = 'available' THEN 1 END) AS seats_remaining,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'economy' THEN 1 END) AS economy_seats_remaining,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'business' THEN 1 END) AS business_seats_remaining
    FROM flights f
    JOIN airports orig ON f.origin_airport_code = orig.code
    JOIN airports dest ON f.destination_airport_code = dest.code
    LEFT JOIN seats s ON f.id = s.flight_id
    WHERE f.id IN (${placeholders})
    GROUP BY f.id
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = db.prepare(query).all(...flightIds) as any[];

  if (rows.length === 0) {
    throw new Error('None of the requested flight IDs were found.');
  }

  return rows.map((row) => ({
    id: row.id,
    flight_number: row.flight_number,
    origin: row.origin,
    origin_city: row.origin_city,
    destination: row.destination,
    destination_city: row.destination_city,
    departure_at: row.departure_at,
    arrival_at: row.arrival_at,
    duration_minutes: row.duration_minutes,
    price: row.base_price_economy,
    base_price_economy: row.base_price_economy,
    base_price_business: row.base_price_business,
    aircraft_type: row.aircraft_type,
    seats_remaining: row.seats_remaining,
    economy_seats_remaining: row.economy_seats_remaining,
    business_seats_remaining: row.business_seats_remaining,
    cabin_classes: ['economy', 'business'] as CabinClass[],
  }));
}

export function getFlightDetails(flightId: string): FlightDetailsResult {
  if (!flightId) {
    throw new Error('Flight ID is required.');
  }

  expireStaleHolds();
  const db = getDatabase();

  const query = `
    SELECT 
      f.id,
      f.flight_number,
      f.origin_airport_code,
      orig.city AS origin_city,
      orig.name AS origin_name,
      f.destination_airport_code,
      dest.city AS destination_city,
      dest.name AS destination_name,
      f.departure_at,
      f.arrival_at,
      f.duration_minutes,
      f.base_price_economy,
      f.base_price_business,
      f.aircraft_type,
      COUNT(s.id) AS total_seats,
      COUNT(CASE WHEN s.status = 'available' THEN 1 END) AS available_seats,
      COUNT(CASE WHEN s.cabin_class = 'economy' THEN 1 END) AS total_economy,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'economy' THEN 1 END) AS available_economy,
      COUNT(CASE WHEN s.cabin_class = 'business' THEN 1 END) AS total_business,
      COUNT(CASE WHEN s.status = 'available' AND s.cabin_class = 'business' THEN 1 END) AS available_business
    FROM flights f
    JOIN airports orig ON f.origin_airport_code = orig.code
    JOIN airports dest ON f.destination_airport_code = dest.code
    LEFT JOIN seats s ON f.id = s.flight_id
    WHERE f.id = ?
    GROUP BY f.id
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare(query).get(flightId) as any;

  if (!row) {
    throw new Error(`Flight with ID '${flightId}' not found.`);
  }

  return {
    id: row.id,
    flight_number: row.flight_number,
    origin: {
      code: row.origin_airport_code,
      city: row.origin_city,
      name: row.origin_name,
    },
    destination: {
      code: row.destination_airport_code,
      city: row.destination_city,
      name: row.destination_name,
    },
    departure_at: row.departure_at,
    arrival_at: row.arrival_at,
    duration_minutes: row.duration_minutes,
    aircraft_type: row.aircraft_type,
    base_price_economy: row.base_price_economy,
    base_price_business: row.base_price_business,
    seat_availability: {
      total_seats: row.total_seats,
      available_seats: row.available_seats,
      economy: {
        total: row.total_economy,
        available: row.available_economy,
        price: row.base_price_economy,
      },
      business: {
        total: row.total_business,
        available: row.available_business,
        price: row.base_price_business,
      },
    },
  };
}
