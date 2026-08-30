import { getDatabase, resetDatabase } from './db';
import { Airport, Seat } from './types';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

export const SEEDED_AIRPORTS: Omit<Airport, 'created_at'>[] = [
  { code: 'BOG', city: 'Bogota', name: 'El Dorado International Airport' },
  { code: 'MDE', city: 'Medellin', name: 'Jose Maria Cordova International Airport' },
  { code: 'CLO', city: 'Cali', name: 'Alfonso Bonilla Aragon International Airport' },
  { code: 'BAQ', city: 'Barranquilla', name: 'Ernesto Cortissoz International Airport' },
  { code: 'CTG', city: 'Cartagena', name: 'Rafael Nunez International Airport' },
  { code: 'BGA', city: 'Bucaramanga', name: 'Palonegro International Airport' },
  { code: 'PEI', city: 'Pereira', name: 'Matecana International Airport' },
  { code: 'ADZ', city: 'San Andres', name: 'Gustavo Rojas Pinilla International Airport' },
  { code: 'SMR', city: 'Santa Marta', name: 'Simon Bolivar International Airport' },
  { code: 'CUC', city: 'Cucuta', name: 'Camilo Daza International Airport' },
];

interface RouteTemplate {
  origin: string;
  destination: string;
  durationMinutes: number;
  basePriceEco: number;
  basePriceBus: number;
  flightPrefix: string;
  aircraft: string;
  dailySchedules: Array<{ depHour: number; depMin: number }>;
}

const ROUTE_TEMPLATES: RouteTemplate[] = [
  // Bogota <-> Medellin (high frequency)
  {
    origin: 'BOG',
    destination: 'MDE',
    durationMinutes: 55,
    basePriceEco: 165000,
    basePriceBus: 360000,
    flightPrefix: 'VY-10',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 6, depMin: 15 },
      { depHour: 9, depMin: 30 },
      { depHour: 14, depMin: 0 },
      { depHour: 18, depMin: 45 },
    ],
  },
  {
    origin: 'MDE',
    destination: 'BOG',
    durationMinutes: 55,
    basePriceEco: 165000,
    basePriceBus: 360000,
    flightPrefix: 'VY-11',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 7, depMin: 45 },
      { depHour: 11, depMin: 15 },
      { depHour: 16, depMin: 20 },
      { depHour: 20, depMin: 30 },
    ],
  },

  // Bogota <-> Cartagena (tourist hub)
  {
    origin: 'BOG',
    destination: 'CTG',
    durationMinutes: 85,
    basePriceEco: 220000,
    basePriceBus: 480000,
    flightPrefix: 'VY-20',
    aircraft: 'Airbus A321neo',
    dailySchedules: [
      { depHour: 7, depMin: 0 },
      { depHour: 11, depMin: 30 },
      { depHour: 16, depMin: 0 },
      { depHour: 19, depMin: 30 },
    ],
  },
  {
    origin: 'CTG',
    destination: 'BOG',
    durationMinutes: 85,
    basePriceEco: 220000,
    basePriceBus: 480000,
    flightPrefix: 'VY-21',
    aircraft: 'Airbus A321neo',
    dailySchedules: [
      { depHour: 9, depMin: 15 },
      { depHour: 13, depMin: 45 },
      { depHour: 18, depMin: 15 },
      { depHour: 21, depMin: 45 },
    ],
  },

  // Bogota <-> Cali
  {
    origin: 'BOG',
    destination: 'CLO',
    durationMinutes: 60,
    basePriceEco: 175000,
    basePriceBus: 380000,
    flightPrefix: 'VY-30',
    aircraft: 'Boeing 737-800',
    dailySchedules: [
      { depHour: 8, depMin: 0 },
      { depHour: 13, depMin: 0 },
      { depHour: 17, depMin: 30 },
    ],
  },
  {
    origin: 'CLO',
    destination: 'BOG',
    durationMinutes: 60,
    basePriceEco: 175000,
    basePriceBus: 380000,
    flightPrefix: 'VY-31',
    aircraft: 'Boeing 737-800',
    dailySchedules: [
      { depHour: 9, depMin: 45 },
      { depHour: 14, depMin: 45 },
      { depHour: 19, depMin: 15 },
    ],
  },

  // Bogota <-> Santa Marta
  {
    origin: 'BOG',
    destination: 'SMR',
    durationMinutes: 90,
    basePriceEco: 235000,
    basePriceBus: 495000,
    flightPrefix: 'VY-40',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 8, depMin: 30 },
      { depHour: 15, depMin: 15 },
    ],
  },
  {
    origin: 'SMR',
    destination: 'BOG',
    durationMinutes: 90,
    basePriceEco: 235000,
    basePriceBus: 495000,
    flightPrefix: 'VY-41',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 10, depMin: 45 },
      { depHour: 17, depMin: 30 },
    ],
  },

  // Bogota <-> San Andres Island
  {
    origin: 'BOG',
    destination: 'ADZ',
    durationMinutes: 130,
    basePriceEco: 340000,
    basePriceBus: 690000,
    flightPrefix: 'VY-50',
    aircraft: 'Boeing 737-800',
    dailySchedules: [
      { depHour: 7, depMin: 30 },
      { depHour: 14, depMin: 30 },
    ],
  },
  {
    origin: 'ADZ',
    destination: 'BOG',
    durationMinutes: 130,
    basePriceEco: 340000,
    basePriceBus: 690000,
    flightPrefix: 'VY-51',
    aircraft: 'Boeing 737-800',
    dailySchedules: [
      { depHour: 10, depMin: 30 },
      { depHour: 17, depMin: 30 },
    ],
  },

  // Medellin <-> Cartagena
  {
    origin: 'MDE',
    destination: 'CTG',
    durationMinutes: 70,
    basePriceEco: 195000,
    basePriceBus: 420000,
    flightPrefix: 'VY-60',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 8, depMin: 15 },
      { depHour: 15, depMin: 0 },
    ],
  },
  {
    origin: 'CTG',
    destination: 'MDE',
    durationMinutes: 70,
    basePriceEco: 195000,
    basePriceBus: 420000,
    flightPrefix: 'VY-61',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 10, depMin: 10 },
      { depHour: 17, depMin: 0 },
    ],
  },

  // Bogota <-> Barranquilla
  {
    origin: 'BOG',
    destination: 'BAQ',
    durationMinutes: 90,
    basePriceEco: 210000,
    basePriceBus: 450000,
    flightPrefix: 'VY-70',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 9, depMin: 0 },
      { depHour: 17, depMin: 0 },
    ],
  },
  {
    origin: 'BAQ',
    destination: 'BOG',
    durationMinutes: 90,
    basePriceEco: 210000,
    basePriceBus: 450000,
    flightPrefix: 'VY-71',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 11, depMin: 15 },
      { depHour: 19, depMin: 15 },
    ],
  },

  // Bogota <-> Pereira (Coffee Triangle)
  {
    origin: 'BOG',
    destination: 'PEI',
    durationMinutes: 50,
    basePriceEco: 155000,
    basePriceBus: 330000,
    flightPrefix: 'VY-80',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 6, depMin: 45 },
      { depHour: 16, depMin: 30 },
    ],
  },
  {
    origin: 'PEI',
    destination: 'BOG',
    durationMinutes: 50,
    basePriceEco: 155000,
    basePriceBus: 330000,
    flightPrefix: 'VY-81',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 8, depMin: 15 },
      { depHour: 18, depMin: 0 },
    ],
  },

  // Bogota <-> Bucaramanga
  {
    origin: 'BOG',
    destination: 'BGA',
    durationMinutes: 55,
    basePriceEco: 150000,
    basePriceBus: 320000,
    flightPrefix: 'VY-84',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 7, depMin: 15 },
      { depHour: 15, depMin: 45 },
    ],
  },
  {
    origin: 'BGA',
    destination: 'BOG',
    durationMinutes: 55,
    basePriceEco: 150000,
    basePriceBus: 320000,
    flightPrefix: 'VY-85',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 8, depMin: 50 },
      { depHour: 17, depMin: 20 },
    ],
  },

  // Bogota <-> Cucuta
  {
    origin: 'BOG',
    destination: 'CUC',
    durationMinutes: 70,
    basePriceEco: 180000,
    basePriceBus: 390000,
    flightPrefix: 'VY-90',
    aircraft: 'Boeing 737-800',
    dailySchedules: [
      { depHour: 10, depMin: 0 },
      { depHour: 18, depMin: 10 },
    ],
  },
  {
    origin: 'CUC',
    destination: 'BOG',
    durationMinutes: 70,
    basePriceEco: 180000,
    basePriceBus: 390000,
    flightPrefix: 'VY-91',
    aircraft: 'Boeing 737-800',
    dailySchedules: [
      { depHour: 11, depMin: 50 },
      { depHour: 20, depMin: 0 },
    ],
  },

  // Medellin <-> San Andres
  {
    origin: 'MDE',
    destination: 'ADZ',
    durationMinutes: 110,
    basePriceEco: 310000,
    basePriceBus: 630000,
    flightPrefix: 'VY-94',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 9, depMin: 30 },
    ],
  },
  {
    origin: 'ADZ',
    destination: 'MDE',
    durationMinutes: 110,
    basePriceEco: 310000,
    basePriceBus: 630000,
    flightPrefix: 'VY-95',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 12, depMin: 15 },
    ],
  },

  // Cali <-> Cartagena
  {
    origin: 'CLO',
    destination: 'CTG',
    durationMinutes: 95,
    basePriceEco: 240000,
    basePriceBus: 510000,
    flightPrefix: 'VY-98',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 11, depMin: 0 },
    ],
  },
  {
    origin: 'CTG',
    destination: 'CLO',
    durationMinutes: 95,
    basePriceEco: 240000,
    basePriceBus: 510000,
    flightPrefix: 'VY-99',
    aircraft: 'Airbus A320neo',
    dailySchedules: [
      { depHour: 13, depMin: 30 },
    ],
  },
];

/**
 * Generates the seat map for a flight.
 * Business: Rows 1-4 (Seats A, C, D, F)
 * Economy: Rows 5-30 (Seats A, B, C, D, E, F)
 */
export function generateSeatMapForFlight(
  flightId: string,
  basePriceEco: number,
  basePriceBus: number
): Seat[] {
  const seats: Seat[] = [];

  // Business class: Rows 1-4, 4 seats per row (A, C, D, F)
  const businessLetters = ['A', 'C', 'D', 'F'];
  for (let row = 1; row <= 4; row++) {
    for (const letter of businessLetters) {
      // Row 1 has premium front legroom (+20,000 COP)
      const seatModifier = row === 1 ? 20000 : 0;
      seats.push({
        id: crypto.randomUUID(),
        flight_id: flightId,
        seat_number: `${row}${letter}`,
        cabin_class: 'business',
        status: 'available',
        held_until: null,
        version: 1,
        price: basePriceBus + seatModifier,
      });
    }
  }

  // Economy class: Rows 5-30, 6 seats per row (A, B, C, D, E, F)
  const ecoLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let row = 5; row <= 30; row++) {
    for (const letter of ecoLetters) {
      let seatModifier = 0;
      // Exit rows 14 & 15 have extra legroom (+25,000 COP)
      if (row === 14 || row === 15) {
        seatModifier += 25000;
      }
      // Preferred front economy rows 5-8 (+15,000 COP)
      else if (row <= 8) {
        seatModifier += 15000;
      }
      // Window (A, F) or Aisle (C, D) slight preference (+5,000 COP)
      else if (letter === 'A' || letter === 'F' || letter === 'C' || letter === 'D') {
        seatModifier += 5000;
      }

      seats.push({
        id: crypto.randomUUID(),
        flight_id: flightId,
        seat_number: `${row}${letter}`,
        cabin_class: 'economy',
        status: 'available',
        held_until: null,
        version: 1,
        price: basePriceEco + seatModifier,
      });
    }
  }

  return seats;
}

export function seedDatabase(customDb?: Database.Database): { airportsCount: number; flightsCount: number; seatsCount: number } {
  const db = customDb || getDatabase();
  resetDatabase(db);

  const now = new Date();
  const isoNow = now.toISOString();

  // 1. Insert Airports
  const insertAirportStmt = db.prepare(`
    INSERT INTO airports (code, city, name, created_at)
    VALUES (?, ?, ?, ?)
  `);

  for (const airport of SEEDED_AIRPORTS) {
    insertAirportStmt.run(airport.code, airport.city, airport.name, isoNow);
  }

  // 2. Generate and Insert Flights for the next 14 days
  const insertFlightStmt = db.prepare(`
    INSERT INTO flights (
      id, flight_number, origin_airport_code, destination_airport_code,
      departure_at, arrival_at, duration_minutes,
      base_price_economy, base_price_business, aircraft_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSeatStmt = db.prepare(`
    INSERT INTO seats (
      id, flight_id, seat_number, cabin_class, status, held_until, version, price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalFlights = 0;
  let totalSeats = 0;

  const insertAll = db.transaction(() => {
    // Generate flights for 14 days starting from today (day 0) to day 13
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const flightDate = new Date(now);
      flightDate.setDate(now.getDate() + dayOffset);

      for (const route of ROUTE_TEMPLATES) {
        for (let idx = 0; idx < route.dailySchedules.length; idx++) {
          const schedule = route.dailySchedules[idx];
          
          const departure = new Date(flightDate);
          departure.setHours(schedule.depHour, schedule.depMin, 0, 0);

          const arrival = new Date(departure.getTime() + route.durationMinutes * 60 * 1000);

          const flightId = crypto.randomUUID();
          const flightNumSuffix = `${idx + 1}`.padStart(2, '0');
          const flightNumber = `${route.flightPrefix}${flightNumSuffix}`;

          insertFlightStmt.run(
            flightId,
            flightNumber,
            route.origin,
            route.destination,
            departure.toISOString(),
            arrival.toISOString(),
            route.durationMinutes,
            route.basePriceEco,
            route.basePriceBus,
            route.aircraft,
            isoNow
          );

          totalFlights++;

          // Generate seat map
          const seats = generateSeatMapForFlight(flightId, route.basePriceEco, route.basePriceBus);
          for (const seat of seats) {
            insertSeatStmt.run(
              seat.id,
              seat.flight_id,
              seat.seat_number,
              seat.cabin_class,
              seat.status,
              seat.held_until,
              seat.version,
              seat.price
            );
            totalSeats++;
          }
        }
      }
    }
  });

  insertAll();

  return {
    airportsCount: SEEDED_AIRPORTS.length,
    flightsCount: totalFlights,
    seatsCount: totalSeats,
  };
}
