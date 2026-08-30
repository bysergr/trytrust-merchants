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
  const {
    booking_session_id,
    flight_id,
    seat_number,
    seat_numbers,
    passenger_name,
    passenger_document_id,
    contact_email,
  } = params;

  if (!passenger_name || !passenger_name.trim()) {
    throw new Error('Passenger name is required.');
  }
  if (!passenger_document_id || !passenger_document_id.trim()) {
    throw new Error('Passenger document ID / passport is required.');
  }
  if (!contact_email || !contact_email.trim() || !contact_email.includes('@')) {
    throw new Error('A valid contact email address is required.');
  }

  const normalizedSessionId = booking_session_id?.trim();
  const normalizedFlightId = flight_id?.trim();

  // Collect direct seat numbers if provided
  const directSeatNumbers: string[] = [];
  if (seat_number && typeof seat_number === 'string' && seat_number.trim()) {
    directSeatNumbers.push(seat_number.trim().toUpperCase());
  }
  if (seat_numbers && Array.isArray(seat_numbers)) {
    for (const sn of seat_numbers) {
      if (typeof sn === 'string' && sn.trim()) {
        const norm = sn.trim().toUpperCase();
        if (!directSeatNumbers.includes(norm)) {
          directSeatNumbers.push(norm);
        }
      }
    }
  }

  if (!normalizedSessionId && (!normalizedFlightId || directSeatNumbers.length === 0)) {
    throw new Error(
      'Either booking_session_id (with held seats) or flight_id and seat_number must be provided.'
    );
  }

  const db = getDatabase();
  let result!: PayResult;

  const transaction = db.transaction(() => {
    // 1. Lazy expire stale holds
    expireStaleHolds(db);

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Check if an active session exists with held seats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let heldBooking: any = null;
    let heldSeats: Seat[] = [];

    if (normalizedSessionId) {
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
      heldBooking = bookingStmt.get(normalizedSessionId);

      if (heldBooking) {
        if (heldBooking.status === 'confirmed') {
          throw new Error('This booking has already been paid and confirmed.');
        }

        const seatsStmt = db.prepare(`
          SELECT s.id, s.flight_id, s.seat_number, s.cabin_class, s.status, s.held_until, s.version, s.price
          FROM seats s
          JOIN booking_seats bs ON s.id = bs.seat_id
          WHERE bs.booking_id = ?
          ORDER BY s.seat_number ASC
        `);
        heldSeats = seatsStmt.all(heldBooking.id) as Seat[];
      }
    }

    // Branch A: Process payment on existing held seats in booking session
    if (heldBooking && heldSeats.length > 0) {
      // Validate that all held seats are active and unexpired
      for (const seat of heldSeats) {
        const isExpired = seat.held_until && new Date(seat.held_until).getTime() <= now.getTime();
        if (seat.status !== 'held' || isExpired) {
          throw new Error(
            `Hold on seat '${seat.seat_number}' has expired. Please return to seat selection and choose your seats again.`
          );
        }
      }

      // Convert seats from 'held' to 'booked' atomically
      const updateSeatStmt = db.prepare(`
        UPDATE seats
        SET status = 'booked',
            held_until = NULL,
            version = version + 1
        WHERE id = ?
          AND status = 'held'
      `);

      for (const seat of heldSeats) {
        const updateResult = updateSeatStmt.run(seat.id);
        if (updateResult.changes === 0) {
          throw new Error(
            `Unable to finalize seat '${seat.seat_number}'. Seat status was modified concurrently.`
          );
        }
      }

      const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const bookingReference = `VY-${randomCode}`;
      const totalPrice = heldSeats.reduce((sum, s) => sum + s.price, 0);

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
        heldBooking.id
      );

      result = {
        success: true,
        booking_reference: bookingReference,
        booking_id: heldBooking.id,
        status: 'confirmed',
        flight: {
          id: heldBooking.flight_id,
          flight_number: heldBooking.flight_number,
          origin: heldBooking.origin,
          origin_city: heldBooking.origin_city,
          destination: heldBooking.destination,
          destination_city: heldBooking.destination_city,
          departure_at: heldBooking.departure_at,
          arrival_at: heldBooking.arrival_at,
          aircraft_type: heldBooking.aircraft_type,
        },
        passengers: {
          name: passenger_name.trim(),
          document_id: passenger_document_id.trim(),
          email: contact_email.trim().toLowerCase(),
        },
        seats: heldSeats.map((s) => ({
          seat_number: s.seat_number,
          cabin_class: s.cabin_class,
          price: s.price,
        })),
        total_price: totalPrice,
        confirmed_at: nowIso,
      };
      return;
    }

    // Branch B: Direct booking with flight_id and seat_number / seat_numbers
    if (normalizedFlightId && directSeatNumbers.length > 0) {
      const flightStmt = db.prepare(`
        SELECT 
          f.id,
          f.flight_number,
          f.origin_airport_code AS origin,
          orig.city AS origin_city,
          f.destination_airport_code AS destination,
          dest.city AS destination_city,
          f.departure_at,
          f.arrival_at,
          f.aircraft_type
        FROM flights f
        JOIN airports orig ON f.origin_airport_code = orig.code
        JOIN airports dest ON f.destination_airport_code = dest.code
        WHERE f.id = ?
      `);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flight = flightStmt.get(normalizedFlightId) as any;

      if (!flight) {
        throw new Error(`Flight with ID '${normalizedFlightId}' not found.`);
      }

      // Fetch requested seats
      const placeholders = directSeatNumbers.map(() => '?').join(',');
      const seatsStmt = db.prepare(`
        SELECT s.id, s.flight_id, s.seat_number, s.cabin_class, s.status, s.held_until, s.version, s.price
        FROM seats s
        WHERE s.flight_id = ? AND UPPER(s.seat_number) IN (${placeholders})
        ORDER BY s.seat_number ASC
      `);
      const targetSeats = seatsStmt.all(normalizedFlightId, ...directSeatNumbers) as Seat[];

      // Check all requested seats exist
      const foundSeatNumbers = new Set(targetSeats.map((s) => s.seat_number.toUpperCase()));
      for (const seatNum of directSeatNumbers) {
        if (!foundSeatNumbers.has(seatNum)) {
          throw new Error(`Seat '${seatNum}' does not exist on flight ${normalizedFlightId}.`);
        }
      }

      // Validate availability
      for (const seat of targetSeats) {
        const isAvailable =
          seat.status === 'available' ||
          (seat.status === 'held' && seat.held_until && new Date(seat.held_until).getTime() <= now.getTime());
        if (!isAvailable) {
          throw new Error(
            `Seat '${seat.seat_number}' is not available for booking (status: ${seat.status}). Please choose another seat.`
          );
        }
      }

      // Update seats directly to 'booked' atomically
      const updateSeatStmt = db.prepare(`
        UPDATE seats
        SET status = 'booked',
            held_until = NULL,
            version = version + 1
        WHERE id = ?
          AND version = ?
          AND (status = 'available' OR held_until <= ?)
      `);

      for (const seat of targetSeats) {
        const updateResult = updateSeatStmt.run(seat.id, seat.version, nowIso);
        if (updateResult.changes === 0) {
          throw new Error(
            `Unable to book seat '${seat.seat_number}'. Seat was modified concurrently by another request.`
          );
        }
      }

      // Create or update booking record
      const finalSessionId = normalizedSessionId || crypto.randomUUID();
      const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const bookingReference = `VY-${randomCode}`;
      const totalPrice = targetSeats.reduce((sum, s) => sum + s.price, 0);

      let bookingId = crypto.randomUUID();
      if (heldBooking) {
        bookingId = heldBooking.id;
        db.prepare(`
          UPDATE bookings
          SET flight_id = ?,
              status = 'confirmed',
              passenger_name = ?,
              passenger_document_id = ?,
              contact_email = ?,
              total_price = ?,
              confirmed_at = ?
          WHERE id = ?
        `).run(
          normalizedFlightId,
          passenger_name.trim(),
          passenger_document_id.trim(),
          contact_email.trim().toLowerCase(),
          totalPrice,
          nowIso,
          bookingId
        );
      } else {
        db.prepare(`
          INSERT INTO bookings (
            id, booking_session_id, flight_id, status,
            passenger_name, passenger_document_id, contact_email,
            total_price, created_at, confirmed_at
          ) VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?)
        `).run(
          bookingId,
          finalSessionId,
          normalizedFlightId,
          passenger_name.trim(),
          passenger_document_id.trim(),
          contact_email.trim().toLowerCase(),
          totalPrice,
          nowIso,
          nowIso
        );
      }

      // Link booking seats
      const linkSeatStmt = db.prepare(`
        INSERT OR IGNORE INTO booking_seats (booking_id, seat_id)
        VALUES (?, ?)
      `);
      for (const seat of targetSeats) {
        linkSeatStmt.run(bookingId, seat.id);
      }

      result = {
        success: true,
        booking_reference: bookingReference,
        booking_id: bookingId,
        status: 'confirmed',
        flight: {
          id: flight.id,
          flight_number: flight.flight_number,
          origin: flight.origin,
          origin_city: flight.origin_city,
          destination: flight.destination,
          destination_city: flight.destination_city,
          departure_at: flight.departure_at,
          arrival_at: flight.arrival_at,
          aircraft_type: flight.aircraft_type,
        },
        passengers: {
          name: passenger_name.trim(),
          document_id: passenger_document_id.trim(),
          email: contact_email.trim().toLowerCase(),
        },
        seats: targetSeats.map((s) => ({
          seat_number: s.seat_number,
          cabin_class: s.cabin_class,
          price: s.price,
        })),
        total_price: totalPrice,
        confirmed_at: nowIso,
      };
      return;
    }

    // If normalizedSessionId was provided but had no held seats and no direct booking was specified
    if (normalizedSessionId) {
      throw new Error(
        `No active held seats found for booking session '${normalizedSessionId}'. Please select seats first or provide flight_id and seat_number.`
      );
    }

    throw new Error('Either booking_session_id or flight_id and seat_number must be provided.');
  });

  transaction();
  return result;
}
