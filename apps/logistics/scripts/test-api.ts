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
    pickup_address: 'Parque de la 93, Chicó, Bogotá',
    dropoff_address: 'Aeropuerto Internacional El Dorado, Terminal 1',
  });
  console.log(`✅ Calculated quote: $${quote.total_price.toLocaleString('es-CO')} COP for ${quote.distance_km} km`);

  // Test creating ride
  const ride = createRideRequest(
    {
      vehicle_type_id: 'ride-economy',
      pickup_address: 'Parque de la 93, Chicó, Bogotá',
      dropoff_address: 'Aeropuerto Internacional El Dorado, Terminal 1',
    },
    sessionId
  );
  console.log(`✅ Created ride request: ${ride.id} (${ride.status}) - Price: $${ride.price.toLocaleString('es-CO')} COP`);

  // Test session list
  const sessionReqs = listRequestsBySession(sessionId);
  console.log(`✅ Retrieved ${sessionReqs.length} requests for session ${sessionId}`);

  // Test admin list and update
  const allReqs = listAllRequests();
  console.log(`✅ Admin retrieved ${allReqs.length} total requests`);

  const updatedAdmin = adminUpdateRequest(ride.id, {
    price: 45000,
    scheduled_at: '2026-09-02T10:00:00Z',
  });
  console.log(`✅ Admin updated request price: $${updatedAdmin.price.toLocaleString('es-CO')} COP, scheduled_at: ${updatedAdmin.scheduled_at}`);

  // Test payment
  const paid = payRequest({
    session_id: sessionId,
    request_id: ride.id,
    payment_confirmation: 'PSE-AUTH-9999',
  });
  console.log(`✅ Paid request: ${paid.id} (${paid.payment_status})`);

  // Test cancel (completed/paid request handling)
  const pkg = createRideRequest(
    {
      vehicle_type_id: 'ride-xl',
      pickup_address: 'Unicentro Bogotá',
      dropoff_address: 'Torre Colpatria, Bogotá',
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
