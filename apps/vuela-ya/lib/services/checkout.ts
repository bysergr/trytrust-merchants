import { getDatabase } from '../db';
import { BookingDetail, PayParams, PayResult, Seat } from '../types';
import { expireStaleHolds } from './expiration';
import crypto from 'node:crypto';

export function getBookingBySession(sessionId: string): BookingDetail | null {
  if (!sessionId) return null;

  expireStaleHolds();
  const db = getDatabase();

  const bookingQuery = `
    SELECT 
      b.id,
      b.booking_session_id,
      b.flight_id,
      b.status,
      b.passenger_name,
      b.passenger_document_id,
      b.contact_email,
      b.total_price,
      b.created_at,
      b.confirmed_at,
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
      f.aircraft_type
    FROM bookings b
    JOIN flights f ON b.flight_id = f.id
    JOIN airports orig ON f.origin_airport_code = orig.code
    JOIN airports dest ON f.destination_airport_code = dest.code
    WHERE b.booking_session_id = ?
  `;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare(bookingQuery).get(sessionId) as any;
  if (!row) {
    return null;
  }

  const seatsStmt = db.prepare(`
    SELECT s.id, s.flight_id, s.seat_number, s.cabin_class, s.status, s.held_until, s.version, s.price
    FROM seats s
    JOIN booking_seats bs ON s.id = bs.seat_id
    WHERE bs.booking_id = ?
    ORDER BY s.seat_number ASC
  `);
  const seats = seatsStmt.all(row.id) as Seat[];

  return {
    id: row.id,
    booking_session_id: row.booking_session_id,
    flight_id: row.flight_id,
    status: row.status,
    passenger_name: row.passenger_name,
    passenger_document_id: row.passenger_document_id,
    contact_email: row.contact_email,
    total_price: row.total_price,
    created_at: row.created_at,
    confirmed_at: row.confirmed_at,
    flight: {
      id: row.flight_id,
      flight_number: row.flight_number,
      origin_airport_code: row.origin_airport_code,
      origin_city: row.origin_city,
      origin_name: row.origin_name,
      destination_airport_code: row.destination_airport_code,
      destination_city: row.destination_city,
      destination_name: row.destination_name,
      departure_at: row.departure_at,
      arrival_at: row.arrival_at,
      duration_minutes: row.duration_minutes,
      base_price_economy: row.base_price_economy,
      base_price_business: row.base_price_business,
      aircraft_type: row.aircraft_type,
      created_at: row.created_at,
    },
    seats,
  };
}

export function executePayment(params: PayParams): PayResult {
  const { booking_session_id, passenger_name, passenger_document_id, contact_email } = params;

  if (!booking_session_id) {
    throw new Error('Booking session ID is required.');
  }
  if (!passenger_name || !passenger_name.trim()) {
    throw new Error('Passenger name is required.');
  }
  if (!passenger_document_id || !passenger_document_id.trim()) {
    throw new Error('Passenger document ID / passport is required.');
  }
  if (!contact_email || !contact_email.trim() || !contact_email.includes('@')) {
    throw new Error('A valid contact email address is required.');
  }

  const db = getDatabase();
  let result!: PayResult;

  const transaction = db.transaction(() => {
    // 1. Lazy expire stale holds
    expireStaleHolds(db);

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Fetch booking
    const bookingStmt = db.prepare(`
      SELECT 
        b.id,
        b.booking_session_id,
        b.flight_id,
        b.status,
        b.total_price,
        f.flight_number,
        f.origin_airport_code AS origin,
        orig.city AS origin_city,
        f.destination_airport_code AS destination,
        dest.city AS destination_city,
        f.departure_at,
        f.arrival_at,
        f.aircraft_type
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN airports orig ON f.origin_airport_code = orig.code
      JOIN airports dest ON f.destination_airport_code = dest.code
      WHERE b.booking_session_id = ?
    `);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = bookingStmt.get(booking_session_id) as any;

    if (!booking) {
      throw new Error(`No booking session found for ID '${booking_session_id}'. Please select seats first.`);
    }

    if (booking.status === 'confirmed') {
      throw new Error('This booking has already been paid and confirmed.');
    }

    // 3. Fetch held seats
    const seatsStmt = db.prepare(`
      SELECT s.id, s.seat_number, s.cabin_class, s.status, s.held_until, s.version, s.price
      FROM seats s
      JOIN booking_seats bs ON s.id = bs.seat_id
      WHERE bs.booking_id = ?
    `);
    const seats = seatsStmt.all(booking.id) as Seat[];

    if (seats.length === 0) {
      throw new Error('No seats are currently selected or held for this booking. Please select seats before checkout.');
    }

    // 4. Validate that all held seats are active and unexpired
    for (const seat of seats) {
      const isExpired = seat.held_until && new Date(seat.held_until).getTime() <= now.getTime();
      if (seat.status !== 'held' || isExpired) {
        throw new Error(
          `Hold on seat '${seat.seat_number}' has expired. Please return to seat selection and choose your seats again.`
        );
      }
    }

    // 5. Convert seats from 'held' to 'booked' atomically
    const updateSeatStmt = db.prepare(`
      UPDATE seats
      SET status = 'booked',
          held_until = NULL,
          version = version + 1
      WHERE id = ?
        AND status = 'held'
    `);

    for (const seat of seats) {
      const updateResult = updateSeatStmt.run(seat.id);
      if (updateResult.changes === 0) {
        throw new Error(
          `Unable to finalize seat '${seat.seat_number}'. Seat status was modified concurrently.`
        );
      }
    }

    // 6. Generate random booking reference (e.g. VY-849201)
    const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const bookingReference = `VY-${randomCode}`;

    // 7. Update booking record
    const totalPrice = seats.reduce((sum, s) => sum + s.price, 0);
    const updateBookingStmt = db.prepare(`
      UPDATE bookings
      SET status = 'confirmed',
          passenger_name = ?,
          passenger_document_id = ?,
          contact_email = ?,
          total_price = ?,
          confirmed_at = ?
      WHERE id = ?
    `);

    updateBookingStmt.run(
      passenger_name.trim(),
      passenger_document_id.trim(),
      contact_email.trim().toLowerCase(),
      totalPrice,
      nowIso,
      booking.id
    );

    result = {
      success: true,
      booking_reference: bookingReference,
      booking_id: booking.id,
      status: 'confirmed',
      flight: {
        id: booking.flight_id,
        flight_number: booking.flight_number,
        origin: booking.origin,
        origin_city: booking.origin_city,
        destination: booking.destination,
        destination_city: booking.destination_city,
        departure_at: booking.departure_at,
        arrival_at: booking.arrival_at,
        aircraft_type: booking.aircraft_type,
      },
      passengers: {
        name: passenger_name.trim(),
        document_id: passenger_document_id.trim(),
        email: contact_email.trim().toLowerCase(),
      },
      seats: seats.map((s) => ({
        seat_number: s.seat_number,
        cabin_class: s.cabin_class,
        price: s.price,
      })),
      total_price: totalPrice,
      confirmed_at: nowIso,
    };
  });

  transaction();
  return result;
}
