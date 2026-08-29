import { seedDatabase } from '../lib/seed-data';
import { listAirports } from '../lib/services/airports';
import { searchFlights, compareFlights, getFlightDetails } from '../lib/services/flights';
import { getSeatMap, selectSeat, releaseSeat } from '../lib/services/seats';
import { executePayment } from '../lib/services/checkout';
import { expireStaleHolds } from '../lib/services/expiration';
import { getDatabase } from '../lib/db';

async function runMcpTests() {
  console.log('🧪 Starting Full Test Suite for Vuela Ya MCP Tools & Services...\n');

  // 0. Seed fresh database
  console.log('Step 0: Seeding clean database...');
  seedDatabase();
  console.log('✅ Clean database seeded successfully.\n');

  // 1. Tool 1: list_airports
  console.log('Step 1: Testing Tool 1 - list_airports...');
  const allAirports = listAirports();
  console.log(`  Found ${allAirports.length} domestic Colombian airports.`);
  if (allAirports.length < 10) throw new Error('Expected at least 10 airports');
  const filtered = listAirports('Bogota');
  if (filtered.length !== 1 || filtered[0].code !== 'BOG') {
    throw new Error('Filtering airports by "Bogota" failed');
  }
  console.log('✅ Tool 1 (list_airports) passed.\n');

  // 2. Tool 2: search_flights
  console.log('Step 2: Testing Tool 2 - search_flights...');
  const today = new Date().toISOString().substring(0, 10);
  const bogMdeFlights = searchFlights({
    origin: 'BOG',
    destination: 'MDE',
    departure_date: today,
    passengers: 1,
  });
  console.log(`  Found ${bogMdeFlights.length} flights for BOG -> MDE on ${today}.`);
  if (bogMdeFlights.length === 0) throw new Error('Expected flights between BOG and MDE');

  // Test invalid airport code error handling
  try {
    searchFlights({
      origin: 'XYZ',
      destination: 'MDE',
      departure_date: today,
    });
    throw new Error('Should have thrown error for unknown airport code XYZ');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (!msg.includes('Unknown airport code: XYZ')) {
      throw new Error(`Unexpected error message: ${msg}`);
    }
    console.log(`  ✅ Correctly caught invalid airport code: "${msg}"`);
  }
  console.log('✅ Tool 2 (search_flights) passed.\n');

  // 3. Tool 3: compare_flights
  console.log('Step 3: Testing Tool 3 - compare_flights...');
  if (bogMdeFlights.length < 2) throw new Error('Need at least 2 flights to compare');
  const flight1 = bogMdeFlights[0];
  const flight2 = bogMdeFlights[1];
  const compared = compareFlights([flight1.id, flight2.id]);
  if (compared.length !== 2) throw new Error('Comparison should return 2 flights');
  console.log(`  Compared flights: ${compared[0].flight_number} vs ${compared[1].flight_number}`);
  console.log('✅ Tool 3 (compare_flights) passed.\n');

  // 4. Tool 4: get_flight_details
  console.log('Step 4: Testing Tool 4 - get_flight_details...');
  const details = getFlightDetails(flight1.id);
  if (!details || details.id !== flight1.id) throw new Error('Flight details ID mismatch');
  console.log(`  Flight ${details.flight_number}: ${details.aircraft_type}, ${details.seat_availability.total_seats} total seats`);
  console.log('✅ Tool 4 (get_flight_details) passed.\n');

  // 5. Tool 5: get_seat_map
  console.log('Step 5: Testing Tool 5 - get_seat_map...');
  const seatMap = getSeatMap(flight1.id);
  if (seatMap.seats.length !== 172) throw new Error(`Expected 172 seats, got ${seatMap.seats.length}`);
  if (seatMap.available_seats !== 172) throw new Error('All seats should initially be available');
  console.log(`  Live seat map: ${seatMap.available_seats}/${seatMap.total_seats} seats available`);
  console.log('✅ Tool 5 (get_seat_map) passed.\n');

  // 6. Tool 6: select_seat (Hold generation & immutability)
  console.log('Step 6: Testing Tool 6 - select_seat...');
  const seatToHold = '1A'; // Business class seat
  const select1 = selectSeat({
    flight_id: flight1.id,
    seat_number: seatToHold,
    passenger_name: 'Carlos Mendoza',
  });

  const sessionId = select1.booking_session_id;
  console.log(`  Generated Booking Session ID: ${sessionId}`);
  console.log(`  Held seat: ${select1.held_seat.seat_number} (${select1.held_seat.cabin_class})`);
  console.log(`  Hold expires at: ${select1.held_until}`);

  if (!sessionId || select1.held_seat.status !== 'held') {
    throw new Error('Seat hold failed');
  }

  // Select a second seat (e.g. 1C) with same session ID
  const select2 = selectSeat({
    booking_session_id: sessionId,
    flight_id: flight1.id,
    seat_number: '1C',
  });
  if (select2.all_held_seats.length !== 2) {
    throw new Error('Expected 2 held seats in session');
  }
  console.log(`  Added second seat. Total price for session: $${select2.total_price.toLocaleString('en-US')} COP`);
  console.log('✅ Tool 6 (select_seat) passed.\n');

  // 7. Tool 7: release_seat
  console.log('Step 7: Testing Tool 7 - release_seat...');
  const releaseRes = releaseSeat({
    booking_session_id: sessionId,
    seat_number: '1C',
  });
  if (releaseRes.remaining_held_seats.length !== 1) {
    throw new Error('Expected 1 remaining held seat after release');
  }
  console.log(`  Released seat 1C. Remaining seats: ${releaseRes.remaining_held_seats.map(s => s.seat_number).join(', ')}`);
  console.log('✅ Tool 7 (release_seat) passed.\n');

  // 8. Tool 8: pay (Atomic confirmation)
  console.log('Step 8: Testing Tool 8 - pay...');
  const payRes = executePayment({
    booking_session_id: sessionId,
    passenger_name: 'Carlos Mendoza',
    passenger_document_id: '1098765432',
    contact_email: 'carlos.mendoza@example.com',
  });

  if (!payRes.success || !payRes.booking_reference.startsWith('VY-')) {
    throw new Error('Payment confirmation failed or invalid PNR');
  }
  console.log(`  ✅ Booking confirmed! Reference Code: ${payRes.booking_reference}`);
  console.log(`  Passenger: ${payRes.passengers.name}, Document: ${payRes.passengers.document_id}`);
  console.log(`  Confirmed Seats: ${payRes.seats.map(s => s.seat_number).join(', ')}`);
  console.log(`  Total Paid: $${payRes.total_price.toLocaleString('en-US')} COP`);

  // Verify seat 1A is now 'booked'
  const updatedSeatMap = getSeatMap(flight1.id);
  const seat1A = updatedSeatMap.seats.find(s => s.seat_number === '1A');
  if (seat1A?.status !== 'booked') {
    throw new Error(`Expected seat 1A status to be 'booked', got '${seat1A?.status}'`);
  }
  console.log(`  Seat 1A status in database: '${seat1A.status}' (booked)`);
  console.log('✅ Tool 8 (pay) passed.\n');

  // 9. Test Lazy Hold Expiration
  console.log('Step 9: Testing Lazy Hold Expiration...');
  // Hold seat 2A on a new session
  const holdForExpire = selectSeat({
    flight_id: flight1.id,
    seat_number: '2A',
  });
  // Artificially age the held_until timestamp in the DB to past
  const db = getDatabase();
  db.prepare(`UPDATE seats SET held_until = datetime('now', '-5 minutes') WHERE id = ?`).run(holdForExpire.held_seat.id);

  // Calling expireStaleHolds should release it
  const releasedCount = expireStaleHolds();
  if (releasedCount < 1) {
    throw new Error('Lazy expiration failed to release expired held seat');
  }
  const recheckedMap = getSeatMap(flight1.id);
  const seat2A = recheckedMap.seats.find(s => s.seat_number === '2A');
  if (seat2A?.status !== 'available') {
    throw new Error(`Seat 2A should be 'available' after lazy expiration, got '${seat2A?.status}'`);
  }
  console.log(`  ✅ Expired seat successfully returned to available status.`);
  console.log('✅ Lazy expiration passed.\n');

  console.log('🎉 ALL 8 MCP TOOLS AND SERVICES PASSED WITH ZERO ERRORS!\n');
}

runMcpTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
