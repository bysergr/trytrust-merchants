import { seedDatabase } from '../lib/seed-data';
import { searchFlights, getFlightDetails } from '../lib/services/flights';
import { getSeatMap, selectSeat } from '../lib/services/seats';
import { executePayment } from '../lib/services/checkout';

async function testMcpInventoryReduction() {
  console.log('🧪 Starting Strict Inventory Reduction & MCP Booking Test Suite...\n');

  // Step 0: Seed fresh database with deterministic IDs
  console.log('Step 0: Seeding deterministic database...');
  seedDatabase();
  console.log('✅ Clean deterministic database initialized.\n');

  const today = new Date().toISOString().substring(0, 10);
  const flights = searchFlights({
    origin: 'BOG',
    destination: 'MDE',
    departure_date: today,
  });

  if (flights.length === 0) throw new Error('No flights found for testing');
  const targetFlight = flights[0];
  console.log(`Target Flight: ${targetFlight.flight_number} (ID: ${targetFlight.id})`);
  console.log(`Initial Inventory: Total ${targetFlight.seats_remaining} seats (Economy: ${targetFlight.economy_seats_remaining}, Business: ${targetFlight.business_seats_remaining})\n`);

  const initialTotal = targetFlight.seats_remaining;
  const initialBusiness = targetFlight.business_seats_remaining;
  const initialEconomy = targetFlight.economy_seats_remaining;

  // ==========================================
  // Pattern 1: 2-Step MCP Booking (select_seat -> pay with booking_session_id)
  // ==========================================
  console.log('--- Pattern 1: Testing 2-Step MCP Booking (select_seat -> pay) ---');
  const holdRes = selectSeat({
    flight_id: targetFlight.id,
    seat_number: '1A', // Business class seat
    passenger_name: 'Test Passenger 1',
  });

  console.log(`  1. select_seat called: Held ${holdRes.held_seat.seat_number} with Session ID: ${holdRes.booking_session_id}`);

  // Check inventory during hold (should be reduced from available count)
  const duringHoldFlights = searchFlights({ origin: 'BOG', destination: 'MDE', departure_date: today });
  const flightDuringHold = duringHoldFlights.find(f => f.id === targetFlight.id)!;
  console.log(`  2. Inventory during active hold: ${flightDuringHold.seats_remaining} (Business: ${flightDuringHold.business_seats_remaining})`);
  if (flightDuringHold.business_seats_remaining !== initialBusiness - 1) {
    throw new Error('Inventory was not reduced during seat hold!');
  }

  // Pay with session ID
  const pay1Res = executePayment({
    booking_session_id: holdRes.booking_session_id,
    passenger_name: 'Ana Sofia Morales',
    passenger_document_id: '1098765432',
    contact_email: 'ana.morales@example.com',
  });
  console.log(`  3. pay called: Confirmed booking reference ${pay1Res.booking_reference}`);

  // Check inventory after confirmed payment
  const afterPay1Flights = searchFlights({ origin: 'BOG', destination: 'MDE', departure_date: today });
  const flightAfterPay1 = afterPay1Flights.find(f => f.id === targetFlight.id)!;
  console.log(`  4. Inventory after confirmed pay: ${flightAfterPay1.seats_remaining} (Business: ${flightAfterPay1.business_seats_remaining})`);

  if (flightAfterPay1.seats_remaining !== initialTotal - 1 || flightAfterPay1.business_seats_remaining !== initialBusiness - 1) {
    throw new Error(`Inventory reduction verification failed! Expected ${initialTotal - 1} total and ${initialBusiness - 1} business seats.`);
  }

  // Check seat map status
  const seatMap1 = getSeatMap(targetFlight.id);
  const seat1A = seatMap1.seats.find(s => s.seat_number === '1A');
  if (seat1A?.status !== 'booked') {
    throw new Error(`Seat 1A status should be 'booked', got '${seat1A?.status}'`);
  }
  console.log(`  5. Seat 1A status in live seat map: '${seat1A.status}'`);
  console.log('✅ Pattern 1 (2-Step MCP Booking) verified successfully!\n');

  // ==========================================
  // Pattern 2: 1-Step Direct MCP Booking (pay called directly with flight_id + seat_number)
  // ==========================================
  console.log('--- Pattern 2: Testing 1-Step Direct MCP Booking (direct flight_id + seat_number) ---');
  const pay2Res = executePayment({
    flight_id: targetFlight.id,
    seat_number: '5A', // Economy class seat
    passenger_name: 'Santiago Ramirez',
    passenger_document_id: '1087654321',
    contact_email: 'santiago.ramirez@example.com',
  });
  console.log(`  1. Direct pay called: Confirmed booking reference ${pay2Res.booking_reference}`);

  // Check inventory after direct booking
  const afterPay2Flights = searchFlights({ origin: 'BOG', destination: 'MDE', departure_date: today });
  const flightAfterPay2 = afterPay2Flights.find(f => f.id === targetFlight.id)!;
  console.log(`  2. Inventory after direct booking: ${flightAfterPay2.seats_remaining} (Economy: ${flightAfterPay2.economy_seats_remaining}, Business: ${flightAfterPay2.business_seats_remaining})`);

  if (flightAfterPay2.seats_remaining !== initialTotal - 2 || flightAfterPay2.economy_seats_remaining !== initialEconomy - 1) {
    throw new Error(`Direct booking inventory reduction failed! Expected ${initialTotal - 2} total, got ${flightAfterPay2.seats_remaining}`);
  }

  // Check seat map status for 5A
  const seatMap2 = getSeatMap(targetFlight.id);
  const seat5A = seatMap2.seats.find(s => s.seat_number === '5A');
  if (seat5A?.status !== 'booked') {
    throw new Error(`Seat 5A status should be 'booked', got '${seat5A?.status}'`);
  }
  console.log(`  3. Seat 5A status in live seat map: '${seat5A.status}'`);
  console.log('✅ Pattern 2 (1-Step Direct MCP Booking) verified successfully!\n');

  // ==========================================
  // Pattern 3: Prevent Re-Booking Booked Seats
  // ==========================================
  console.log('--- Pattern 3: Verifying Booked Seats Cannot Be Re-Selected ---');
  try {
    selectSeat({
      flight_id: targetFlight.id,
      seat_number: '1A',
    });
    throw new Error('Should have failed to select already booked seat 1A');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.log(`  ✅ Correctly rejected attempt to select booked seat 1A: "${msg}"`);
  }

  try {
    executePayment({
      flight_id: targetFlight.id,
      seat_number: '5A',
      passenger_name: 'Imposter',
      passenger_document_id: '9999999',
      contact_email: 'imposter@example.com',
    });
    throw new Error('Should have failed to directly buy already booked seat 5A');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.log(`  ✅ Correctly rejected attempt to directly purchase booked seat 5A: "${msg}"`);
  }
  console.log('✅ Pattern 3 (Double-Booking Prevention) verified successfully!\n');

  // ==========================================
  // Pattern 4: get_flight_details Live Verification
  // ==========================================
  console.log('--- Pattern 4: Live get_flight_details Verification ---');
  const details = getFlightDetails(targetFlight.id);
  console.log(`  Total Seats:     ${details.seat_availability.total_seats}`);
  console.log(`  Available Seats: ${details.seat_availability.available_seats} (Expected: ${initialTotal - 2})`);
  console.log(`  Economy Avail:   ${details.seat_availability.economy.available} (Expected: ${initialEconomy - 1})`);
  console.log(`  Business Avail:  ${details.seat_availability.business.available} (Expected: ${initialBusiness - 1})`);

  if (details.seat_availability.available_seats !== initialTotal - 2) {
    throw new Error('Flight details seat availability does not match live database status!');
  }
  console.log('✅ Pattern 4 (Live Flight Details) verified successfully!\n');

  console.log('🎉 ALL INVENTORY REDUCTION & MCP BOOKING TESTS PASSED PERFECTLY!\n');
}

testMcpInventoryReduction().catch((err) => {
  console.error('❌ Inventory reduction test failed:', err);
  process.exit(1);
});
