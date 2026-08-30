import { listVehicleTypes } from '../lib/services/vehicles';
import { calculateQuote } from '../lib/services/geo-pricing';
import {
  createRideRequest,
  createPackageRequest,
  createFreightRequest,
  getRequestById,
  cancelRequest,
  payRequest,
} from '../lib/services/requests';
import { generateSessionId } from '../lib/session-cookie';

async function testAllMcpTools() {
  console.log('🧪 Testing all 8 MCP tools and service operations...\n');
  const sessionId = generateSessionId();
  console.log(`🔑 Test session ID: ${sessionId}\n`);

  // 1. list_vehicle_types
  console.log('1️⃣ Testing tool 1: list_vehicle_types (ride, package, freight)...');
  const rideVehicles = listVehicleTypes('ride');
  const pkgVehicles = listVehicleTypes('package');
  const freightVehicles = listVehicleTypes('freight');
  console.log(`   - Found ${rideVehicles.length} ride vehicle types`);
  console.log(`   - Found ${pkgVehicles.length} package vehicle types`);
  console.log(`   - Found ${freightVehicles.length} freight vehicle types`);
  if (rideVehicles.length === 0 || pkgVehicles.length === 0 || freightVehicles.length === 0) {
    throw new Error('Missing vehicle types in seed');
  }
  console.log('   ✅ Tool 1 passed\n');

  // 2. get_quote
  console.log('2️⃣ Testing tool 2: get_quote (Bogotá)...');
  const quote = calculateQuote({
    service: 'ride',
    vehicle_type_id: rideVehicles[0].id,
    pickup_address: 'Parque de la 93, Chicó, Bogotá',
    dropoff_address: 'Aeropuerto Internacional El Dorado, Terminal 1',
  });
  console.log(`   - Quote total price: $${quote.total_price.toLocaleString('es-CO')} COP (~$${(quote.total_price / 4000).toFixed(2)} USD)`);
  console.log(`   - Distance: ${quote.distance_km} km, Duration: ${quote.duration_minutes} min`);
  console.log('   ✅ Tool 2 passed\n');

  // 3. request_ride
  console.log('3️⃣ Testing tool 3: request_ride (Bogotá)...');
  const rideReq = createRideRequest(
    {
      vehicle_type_id: 'ride-economy',
      pickup_address: 'Parque de la 93, Chicó, Bogotá',
      dropoff_address: 'Aeropuerto Internacional El Dorado, Terminal 1',
    },
    sessionId
  );
  console.log(`   - Ride created: ${rideReq.id}, status: ${rideReq.status}, price: $${rideReq.price.toLocaleString('es-CO')} COP`);
  console.log(`   - Driver assigned: ${rideReq.driver_name} (${rideReq.driver_plate})`);
  console.log('   ✅ Tool 3 passed\n');

  // 4. request_package_delivery
  console.log('4️⃣ Testing tool 4: request_package_delivery (Logistics Express Bogotá)...');
  const pkgReq = createPackageRequest(
    {
      vehicle_type_id: 'pkg-motorcycle',
      pickup_address: 'Torre Colpatria, Centro Internacional, Bogotá',
      dropoff_address: 'Zona T, Calle 82 # 12-35, Bogotá',
      package_description: 'Documentos notariales y contratos corporativos',
      package_weight_kg: 1.5,
    },
    sessionId
  );
  console.log(`   - Package req created: ${pkgReq.id}, status: ${pkgReq.status}, price: $${pkgReq.price.toLocaleString('es-CO')} COP`);
  console.log('   ✅ Tool 4 passed\n');

  // 5. request_freight
  console.log('5️⃣ Testing tool 5: request_freight (Bogotá Carga)...');
  const freightReq = createFreightRequest(
    {
      vehicle_type_id: 'freight-box-truck',
      pickup_address: 'Zona Franca Fontibón, Calle 13, Bogotá',
      dropoff_address: 'Parque Industrial Siberia, Cota - Bogotá',
      cargo_description: '3 estibas con equipos de refrigeración industrial',
      cargo_weight_kg: 1950,
    },
    sessionId
  );
  console.log(`   - Freight req created: ${freightReq.id}, status: ${freightReq.status}, price: $${freightReq.price.toLocaleString('es-CO')} COP`);
  console.log('   ✅ Tool 5 passed\n');

  // 6. track_request
  console.log('6️⃣ Testing tool 6: track_request...');
  const tracked = getRequestById(rideReq.id, sessionId);
  if (!tracked || tracked.id !== rideReq.id) {
    throw new Error('Track request failed to find ride');
  }
  console.log(`   - Tracking status: ${tracked.status}, ETA: ${tracked.estimated_arrival_at}`);
  console.log('   ✅ Tool 6 passed\n');

  // 7. cancel_request
  console.log('7️⃣ Testing tool 7: cancel_request...');
  const cancelled = cancelRequest(pkgReq.id, sessionId);
  console.log(`   - Cancelled request status: ${cancelled.status}`);
  if (cancelled.status !== 'cancelled') {
    throw new Error('Cancel request did not set status to cancelled');
  }
  console.log('   ✅ Tool 7 passed\n');

  // 8. pay
  console.log('8️⃣ Testing tool 8: pay...');
  const paid = payRequest({
    session_id: sessionId,
    request_id: rideReq.id,
    payment_confirmation: 'TXN-TEST-CARD-8832',
  });
  console.log(`   - Payment status: ${paid.payment_status}, confirmation: ${paid.payment_confirmation}`);
  if (paid.payment_status !== 'paid') {
    throw new Error('Payment failed');
  }
  console.log('   ✅ Tool 8 passed\n');

  console.log('🎉 All 8 MCP tools / services passed unit verification successfully!\n');
}

testAllMcpTools().catch((err) => {
  console.error('❌ MCP test failed:', err);
  process.exit(1);
});
