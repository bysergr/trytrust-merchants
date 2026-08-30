import { getDatabase, resetDatabase } from '../lib/db';
import { listVehicleTypes } from '../lib/services/vehicles';
import { calculateQuote } from '../lib/services/geo-pricing';
import { createRideRequest, cancelRequest, payRequest, listRequestsBySession } from '../lib/services/requests';
import { listAllRequests, adminUpdateRequest } from '../lib/services/admin';
import { generateSessionId } from '../lib/session-cookie';

async function testApiIntegrations() {
  console.log('🧪 Testing API service layer integration...\n');
  const db = getDatabase();
  resetDatabase(db);

  const sessionId = generateSessionId();

  // Test vehicle retrieval
  const vehicles = listVehicleTypes();
  console.log(`✅ Retrieved ${vehicles.length} vehicle types`);

  // Test quote calculation
  const quote = calculateQuote({
    service: 'ride',
    vehicle_type_id: 'ride-economy',
    pickup_address: '100 Market St, San Francisco, CA',
    dropoff_address: 'Fisherman Wharf, San Francisco, CA',
  });
  console.log(`✅ Calculated quote: $${quote.total_price.toFixed(2)} USD for ${quote.distance_km} km`);

  // Test creating ride
  const ride = createRideRequest(
    {
      vehicle_type_id: 'ride-economy',
      pickup_address: '100 Market St, SF',
      dropoff_address: 'Fisherman Wharf, SF',
    },
    sessionId
  );
  console.log(`✅ Created ride request: ${ride.id} (${ride.status})`);

  // Test session list
  const sessionReqs = listRequestsBySession(sessionId);
  console.log(`✅ Retrieved ${sessionReqs.length} requests for session ${sessionId}`);

  // Test admin list and update
  const allReqs = listAllRequests();
  console.log(`✅ Admin retrieved ${allReqs.length} total requests`);

  const updatedAdmin = adminUpdateRequest(ride.id, {
    price: 19.99,
    scheduled_at: '2026-09-02T10:00:00Z',
  });
  console.log(`✅ Admin updated request price: $${updatedAdmin.price}, scheduled_at: ${updatedAdmin.scheduled_at}`);

  // Test payment
  const paid = payRequest({
    session_id: sessionId,
    request_id: ride.id,
    payment_confirmation: 'CARD-AUTH-9999',
  });
  console.log(`✅ Paid request: ${paid.id} (${paid.payment_status})`);

  // Test cancel (completed/paid request handling)
  const pkg = createRideRequest(
    {
      vehicle_type_id: 'ride-xl',
      pickup_address: 'SFO Airport',
      dropoff_address: 'Union Square',
    },
    sessionId
  );
  const cancelled = cancelRequest(pkg.id, sessionId);
  console.log(`✅ Cancelled request: ${cancelled.id} (${cancelled.status})`);

  console.log('\n🎉 All API & Admin service integrations validated successfully!\n');
}

testApiIntegrations().catch((err) => {
  console.error('❌ API test failed:', err);
  process.exit(1);
});
