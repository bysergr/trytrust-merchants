import { getDatabase } from '../db';
import {
  ReleaseSeatParams,
  ReleaseSeatResult,
  Seat,
  SeatMapItem,
  SeatMapResult,
  SelectSeatParams,
  SelectSeatResult,
} from '../types';
import { expireStaleHolds } from './expiration';
import crypto from 'node:crypto';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export function getSeatMap(flightId: string, bookingSessionId?: string): SeatMapResult {
  if (!flightId) {
    throw new Error('Flight ID is required.');
  }

  expireStaleHolds();
  const db = getDatabase();

  const flightStmt = db.prepare(`
    SELECT id, flight_number, aircraft_type
    FROM flights
    WHERE id = ?
  `);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flight = flightStmt.get(flightId) as any;
  if (!flight) {
    throw new Error(`Flight with ID '${flightId}' not found.`);
  }

  // Get seats for this session if session ID is provided
  let sessionSeatIds = new Set<string>();
  if (bookingSessionId) {
    const sessionSeatsStmt = db.prepare(`
      SELECT bs.seat_id
      FROM booking_seats bs
      JOIN bookings b ON bs.booking_id = b.id
      WHERE b.booking_session_id = ?
        AND b.status IN ('draft', 'pending_payment')
    `);
    const sessionRows = sessionSeatsStmt.all(bookingSessionId) as { seat_id: string }[];
    sessionSeatIds = new Set(sessionRows.map((r) => r.seat_id));
  }

  const seatsStmt = db.prepare(`
    SELECT id, flight_id, seat_number, cabin_class, status, held_until, version, price
    FROM seats
    WHERE flight_id = ?
  `);
  const rawSeats = seatsStmt.all(flightId) as Seat[];

  // Parse row and letter for sorting and layout
  const seatItems: SeatMapItem[] = rawSeats.map((seat) => {
    const match = seat.seat_number.match(/^(\d+)([A-Z])$/);
    const row = match ? parseInt(match[1], 10) : 0;
    const letter = match ? match[2] : '';
    const isHeldBySession = sessionSeatIds.has(seat.id);

    return {
      id: seat.id,
      seat_number: seat.seat_number,
      row,
      letter,
      cabin_class: seat.cabin_class,
      status: seat.status,
      price: seat.price,
      held_until: seat.held_until,
      is_held_by_current_session: isHeldBySession,
    };
  });

  // Sort seats: Row ascending, then Letter ascending
  seatItems.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.letter.localeCompare(b.letter);
  });

  const availableCount = seatItems.filter((s) => s.status === 'available').length;

  return {
    flight_id: flight.id,
    flight_number: flight.flight_number,
    aircraft_type: flight.aircraft_type,
    total_seats: seatItems.length,
    available_seats: availableCount,
    cabin_layout: {
      business: {
        rows: [1, 2, 3, 4],
        seats_per_row: ['A', 'C', 'D', 'F'],
        layout: '2x2 (A C | D F)',
      },
      economy: {
        rows: Array.from({ length: 26 }, (_, i) => i + 5),
        seats_per_row: ['A', 'B', 'C', 'D', 'E', 'F'],
        layout: '3x3 (A B C | D E F)',
      },
    },
    seats: seatItems,
  };
}

export function selectSeat(params: SelectSeatParams): SelectSeatResult {
  const { flight_id, seat_number } = params;

  if (!flight_id) {
    throw new Error('Flight ID is required.');
  }
  if (!seat_number) {
    throw new Error('Seat number is required.');
  }

  const normalizedSeatNumber = seat_number.trim().toUpperCase();
  const db = getDatabase();

  let finalSessionId = params.booking_session_id?.trim();
  let result!: SelectSeatResult;

  const transaction = db.transaction(() => {
    // 1. Lazy expire any stale holds first
    expireStaleHolds(db);

    const now = new Date();
    const nowIso = now.toISOString();
    const heldUntilIso = new Date(now.getTime() + HOLD_DURATION_MS).toISOString();

    // 2. Validate session ID or generate new
    let bookingId: string;
    if (finalSessionId) {
      const bookingStmt = db.prepare(`
        SELECT id, flight_id, status
        FROM bookings
        WHERE booking_session_id = ?
      `);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingBooking = bookingStmt.get(finalSessionId) as any;

      if (existingBooking) {
        if (existingBooking.status === 'confirmed') {
          throw new Error('This booking has already been confirmed. Please start a new booking session.');
        }
        if (existingBooking.flight_id !== flight_id) {
          // If customer switched flights, release previous flight holds and update flight_id
          const releasePrevSeats = db.prepare(`
            UPDATE seats
            SET status = 'available', held_until = NULL, version = version + 1
            WHERE id IN (SELECT seat_id FROM booking_seats WHERE booking_id = ?)
          `);
          releasePrevSeats.run(existingBooking.id);

          db.prepare(`DELETE FROM booking_seats WHERE booking_id = ?`).run(existingBooking.id);
          db.prepare(`UPDATE bookings SET flight_id = ?, total_price = 0 WHERE id = ?`).run(flight_id, existingBooking.id);
        }
        bookingId = existingBooking.id;
      } else {
        // Session ID was passed by MCP/client but does not exist in DB yet
        bookingId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO bookings (id, booking_session_id, flight_id, status, total_price, created_at)
          VALUES (?, ?, ?, 'draft', 0, ?)
        `).run(bookingId, finalSessionId, flight_id, nowIso);
      }
    } else {
      finalSessionId = crypto.randomUUID();
      bookingId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO bookings (id, booking_session_id, flight_id, status, total_price, created_at)
        VALUES (?, ?, ?, 'draft', 0, ?)
      `).run(bookingId, finalSessionId, flight_id, nowIso);
    }

    // 3. Find target seat with pessimistic lock verification
    const seatStmt = db.prepare(`
      SELECT id, flight_id, seat_number, cabin_class, status, held_until, version, price
      FROM seats
      WHERE flight_id = ? AND UPPER(seat_number) = ?
    `);
    const seat = seatStmt.get(flight_id, normalizedSeatNumber) as Seat | undefined;

    if (!seat) {
      throw new Error(`Seat '${normalizedSeatNumber}' does not exist on flight ${flight_id}.`);
    }

    // Check if this seat is already held by this exact booking
    const alreadyLinked = db.prepare(`
      SELECT 1 FROM booking_seats WHERE booking_id = ? AND seat_id = ?
    `).get(bookingId, seat.id);

    if (alreadyLinked && seat.status === 'held') {
      // Refresh hold timer
      db.prepare(`
        UPDATE seats
        SET held_until = ?, version = version + 1
        WHERE id = ?
      `).run(heldUntilIso, seat.id);
    } else {
      // Check availability
      const isAvailable =
        seat.status === 'available' ||
        (seat.status === 'held' && seat.held_until && new Date(seat.held_until).getTime() <= now.getTime());

      if (!isAvailable) {
        throw new Error(
          `Seat '${normalizedSeatNumber}' is no longer available (${seat.status === 'booked' ? 'already booked' : 'temporarily held by another passenger'}). Please select another seat.`
        );
      }

      // Optimistic lock update
      const updateSeatStmt = db.prepare(`
        UPDATE seats
        SET status = 'held',
            held_until = ?,
            version = version + 1
        WHERE id = ?
          AND version = ?
          AND (status = 'available' OR held_until <= ?)
      `);

      const updateResult = updateSeatStmt.run(heldUntilIso, seat.id, seat.version, nowIso);
      if (updateResult.changes === 0) {
        throw new Error(
          `Seat '${normalizedSeatNumber}' was just taken by another passenger. Please select another seat.`
        );
      }

      // Link seat to booking
      db.prepare(`
        INSERT OR IGNORE INTO booking_seats (booking_id, seat_id)
        VALUES (?, ?)
      `).run(bookingId, seat.id);
    }

    // 4. Fetch all seats held by this booking
    const allHeldSeatsStmt = db.prepare(`
      SELECT s.id, s.flight_id, s.seat_number, s.cabin_class, s.status, s.held_until, s.version, s.price
      FROM seats s
      JOIN booking_seats bs ON s.id = bs.seat_id
      WHERE bs.booking_id = ? AND s.status = 'held'
      ORDER BY s.seat_number ASC
    `);
    const allHeldSeats = allHeldSeatsStmt.all(bookingId) as Seat[];

    // Calculate total price
    const totalPrice = allHeldSeats.reduce((sum, s) => sum + s.price, 0);

    // Update booking total price
    db.prepare(`
      UPDATE bookings
      SET total_price = ?,
          status = 'draft'
      WHERE id = ?
    `).run(totalPrice, bookingId);

    const updatedHeldSeat = allHeldSeats.find((s) => s.id === seat.id) || {
      ...seat,
      status: 'held' as const,
      held_until: heldUntilIso,
      version: seat.version + 1,
    };

    result = {
      booking_session_id: finalSessionId,
      booking_id: bookingId,
      flight_id,
      held_seat: updatedHeldSeat,
      all_held_seats: allHeldSeats,
      held_until: heldUntilIso,
      total_price: totalPrice,
    };
  });

  transaction();
  return result;
}

export function releaseSeat(params: ReleaseSeatParams): ReleaseSeatResult {
  const { booking_session_id, seat_number } = params;

  if (!booking_session_id) {
    throw new Error('Booking session ID is required.');
  }
  if (!seat_number) {
    throw new Error('Seat number is required.');
  }

  const normalizedSeatNumber = seat_number.trim().toUpperCase();
  const db = getDatabase();

  let result!: ReleaseSeatResult;

  const transaction = db.transaction(() => {
    expireStaleHolds(db);

    const bookingStmt = db.prepare(`
      SELECT id, flight_id, status
      FROM bookings
      WHERE booking_session_id = ?
    `);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = bookingStmt.get(booking_session_id) as any;

    if (!booking) {
      throw new Error(`No booking found for session ID '${booking_session_id}'.`);
    }
    if (booking.status === 'confirmed') {
      throw new Error('Cannot release seats on an already confirmed booking.');
    }

    const seatStmt = db.prepare(`
      SELECT s.id, s.flight_id, s.seat_number, s.price
      FROM seats s
      JOIN booking_seats bs ON s.id = bs.seat_id
      WHERE bs.booking_id = ? AND UPPER(s.seat_number) = ?
    `);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seat = seatStmt.get(booking.id, normalizedSeatNumber) as any;

    if (!seat) {
      throw new Error(
        `Seat '${normalizedSeatNumber}' is not held in booking session '${booking_session_id}'.`
      );
    }

    // Release the seat back to available
    db.prepare(`
      UPDATE seats
      SET status = 'available',
          held_until = NULL,
          version = version + 1
      WHERE id = ?
    `).run(seat.id);

    // Delete relation
    db.prepare(`
      DELETE FROM booking_seats
      WHERE booking_id = ? AND seat_id = ?
    `).run(booking.id, seat.id);

    // Fetch remaining held seats
    const remainingSeatsStmt = db.prepare(`
      SELECT s.id, s.flight_id, s.seat_number, s.cabin_class, s.status, s.held_until, s.version, s.price
      FROM seats s
      JOIN booking_seats bs ON s.id = bs.seat_id
      WHERE bs.booking_id = ? AND s.status = 'held'
      ORDER BY s.seat_number ASC
    `);
    const remainingSeats = remainingSeatsStmt.all(booking.id) as Seat[];

    const totalPrice = remainingSeats.reduce((sum, s) => sum + s.price, 0);

    db.prepare(`
      UPDATE bookings
      SET total_price = ?
      WHERE id = ?
    `).run(totalPrice, booking.id);

    result = {
      booking_session_id,
      booking_id: booking.id,
      released_seat_number: normalizedSeatNumber,
      remaining_held_seats: remainingSeats,
      total_price: totalPrice,
    };
  });

  transaction();
  return result;
}
