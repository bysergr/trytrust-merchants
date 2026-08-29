import { seedDatabase } from '../lib/seed-data';
import { searchFlights } from '../lib/services/flights';
import { selectSeat } from '../lib/services/seats';
import { getDatabase } from '../lib/db';
import crypto from 'node:crypto';

async function runRaceConditionTest() {
  console.log('🏁 Starting Concurrency & Race Condition Test for Seat Holds...\n');

  // 1. Seed clean state
  seedDatabase();
  const today = new Date().toISOString().substring(0, 10);
  const flights = searchFlights({
    origin: 'BOG',
    destination: 'MDE',
    departure_date: today,
  });

  if (flights.length === 0) {
    throw new Error('No flights found for race condition test');
  }

  const targetFlight = flights[0];
  const targetSeatNumber = '3A'; // Business class seat

  console.log(`Target Flight: ${targetFlight.flight_number} (${targetFlight.id})`);
  console.log(`Target Seat:   ${targetSeatNumber}`);
  console.log(`Simulating 10 concurrent passenger sessions trying to hold seat ${targetSeatNumber} at the exact same millisecond...\n`);

  const CONCURRENT_CLIENTS = 10;
  const sessions = Array.from({ length: CONCURRENT_CLIENTS }, (_, i) => ({
    sessionId: crypto.randomUUID(),
    clientName: `Passenger_${i + 1}`,
  }));

  interface AttemptResult {
    client: string;
    sessionId: string;
    success: boolean;
    error?: string;
    heldSeat?: string;
  }

  // Execute all 10 selectSeat calls concurrently using Promise.all
  const results: AttemptResult[] = await Promise.all(
    sessions.map(async (client) => {
      try {
        const res = selectSeat({
          booking_session_id: client.sessionId,
          flight_id: targetFlight.id,
          seat_number: targetSeatNumber,
          passenger_name: client.clientName,
        });
        return {
          client: client.clientName,
          sessionId: client.sessionId,
          success: true,
          heldSeat: res.held_seat.seat_number,
        };
      } catch (err) {
        return {
          client: client.clientName,
          sessionId: client.sessionId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    })
  );

  const successfulAttempts = results.filter((r) => r.success);
  const failedAttempts = results.filter((r) => !r.success);

  console.log('--- Concurrency Results ---');
  console.log(`Total Attempts: ${results.length}`);
  console.log(`Successful:     ${successfulAttempts.length}`);
  console.log(`Failed:         ${failedAttempts.length}\n`);

  console.log('Winner:');
  for (const win of successfulAttempts) {
    console.log(`  🎉 ${win.client} (Session: ${win.sessionId}) successfully secured hold on seat ${win.heldSeat}`);
  }

  console.log('\nRejected Attempts (Clean Error Rejection):');
  for (const fail of failedAttempts) {
    console.log(`  ⛔ ${fail.client}: "${fail.error}"`);
  }

  // Verification Assertions
  if (successfulAttempts.length !== 1) {
    throw new Error(
      `CRITICAL FAILURE: Expected exactly 1 successful hold, but got ${successfulAttempts.length}!`
    );
  }

  if (failedAttempts.length !== CONCURRENT_CLIENTS - 1) {
    throw new Error(
      `CRITICAL FAILURE: Expected ${CONCURRENT_CLIENTS - 1} failed holds, but got ${failedAttempts.length}!`
    );
  }

  // Verify Database Integrity
  const db = getDatabase();
  const seatCheck = db.prepare(`
    SELECT id, seat_number, status, version
    FROM seats
    WHERE flight_id = ? AND seat_number = ?
  `).get(targetFlight.id, targetSeatNumber) as { id: string; status: string; version: number };

  const bookingSeatsCheck = db.prepare(`
    SELECT COUNT(*) as count
    FROM booking_seats
    WHERE seat_id = ?
  `).get(seatCheck.id) as { count: number };

  console.log('\n--- Database Integrity Verification ---');
  console.log(`Seat Status:             ${seatCheck.status} (Expected: 'held')`);
  console.log(`Seat Row Version:        ${seatCheck.version} (Optimistic counter incremented)`);
  console.log(`Booking Links in DB:     ${bookingSeatsCheck.count} (Expected: exactly 1)`);

  if (seatCheck.status !== 'held') {
    throw new Error(`Expected seat status 'held', got '${seatCheck.status}'`);
  }

  if (bookingSeatsCheck.count !== 1) {
    throw new Error(`Database corrupted: ${bookingSeatsCheck.count} booking_seats rows found for seat!`);
  }

  console.log('\n✅ CONCURRENCY & RACE CONDITION TEST PASSED! Exactly one session won the hold.\n');
}

runRaceConditionTest().catch((err) => {
  console.error('❌ Race condition test failed:', err);
  process.exit(1);
});
