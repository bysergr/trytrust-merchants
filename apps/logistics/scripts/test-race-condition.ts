import { getDatabase, resetDatabase } from '../lib/db';
import { createRideRequest, cancelRequest } from '../lib/services/requests';
import { generateSessionId } from '../lib/session-cookie';
import { getVehicleTypeById } from '../lib/services/vehicles';
import { ServiceRequest } from '../lib/types';

async function runRaceConditionTest() {
  console.log('🏁 Starting Race Condition Concurrency Test...');
  const db = getDatabase();
  resetDatabase(db);

  const testVehicleTypeId = 'ride-comfort';

  // 1. Manually set available count to exactly 1
  console.log(`\n📦 Setting available inventory for "${testVehicleTypeId}" to exactly 1...`);
  db.prepare(`UPDATE available_vehicles SET count_available = 1, version = 100 WHERE vehicle_type_id = ?`).run(
    testVehicleTypeId
  );

  const initialVehicle = getVehicleTypeById(testVehicleTypeId);
  console.log(`   - Verified initial available count: ${initialVehicle?.count_available}`);
  if (initialVehicle?.count_available !== 1) {
    throw new Error('Failed to set initial vehicle count to 1');
  }

  // 2. Launch 2 simultaneous asynchronous requests competing for the ONLY 1 vehicle available
  const session1 = generateSessionId();
  const session2 = generateSessionId();

  console.log('\n⚡ Launching 2 simultaneous requests for the last 1 vehicle in stock...');
  console.log(`   - Request A (Client 1): Session ${session1}`);
  console.log(`   - Request B (Client 2): Session ${session2}`);

  const results = await Promise.allSettled([
    new Promise((resolve, reject) => {
      try {
        const req = createRideRequest(
          {
            vehicle_type_id: testVehicleTypeId,
            pickup_address: '1 Market St, San Francisco, CA',
            dropoff_address: 'SFO Airport Terminal 1',
          },
          session1
        );
        resolve(req);
      } catch (err) {
        reject(err);
      }
    }),
    new Promise((resolve, reject) => {
      try {
        const req = createRideRequest(
          {
            vehicle_type_id: testVehicleTypeId,
            pickup_address: '500 Howard St, San Francisco, CA',
            dropoff_address: 'SFO Airport Terminal 2',
          },
          session2
        );
        resolve(req);
      } catch (err) {
        reject(err);
      }
    }),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  console.log(`\n📊 Concurrency Results:`);
  console.log(`   - Fulfilled (Matched): ${fulfilled.length}`);
  console.log(`   - Rejected (Out of Stock / Contention): ${rejected.length}`);

  if (fulfilled.length === 1 && rejected.length === 1) {
    console.log('   ✅ EXACTLY 1 request succeeded and matched the vehicle!');
    const rejReason = (rejected[0] as PromiseRejectedResult).reason;
    console.log(`   - Rejection error message: "${rejReason instanceof Error ? rejReason.message : rejReason}"`);
  } else {
    throw new Error(
      `Race condition test failed: expected exactly 1 fulfilled and 1 rejected, got ${fulfilled.length} fulfilled and ${rejected.length} rejected.`
    );
  }

  // 3. Verify database remaining count is 0
  const afterVehicle = getVehicleTypeById(testVehicleTypeId);
  console.log(`\n🔍 Checking remaining count in database: ${afterVehicle?.count_available}`);
  if (afterVehicle?.count_available !== 0) {
    throw new Error(`Expected count_available to be 0, but got ${afterVehicle?.count_available}`);
  }

  // 4. Test third request immediately fails
  console.log('\n🚫 Attempting a 3rd request when count is 0...');
  try {
    createRideRequest(
      {
        vehicle_type_id: testVehicleTypeId,
        pickup_address: '700 Mission St, San Francisco, CA',
        dropoff_address: 'SFO Airport Terminal 3',
      },
      generateSessionId()
    );
    throw new Error('3rd request unexpectedly succeeded when count was 0');
  } catch (err) {
    console.log(`   ✅ Correctly failed: "${err instanceof Error ? err.message : err}"`);
  }

  // 5. Test cancellation restores inventory count atomically
  console.log('\n🔄 Testing cancellation restores vehicle inventory count...');
  const winnerReq = (fulfilled[0] as PromiseFulfilledResult<ServiceRequest>).value;
  const cancelled = cancelRequest(winnerReq.id, winnerReq.session_id);
  console.log(`   - Cancelled request ID: ${cancelled.id}, status: ${cancelled.status}`);

  const restoredVehicle = getVehicleTypeById(testVehicleTypeId);
  console.log(`   - Restored available vehicle count: ${restoredVehicle?.count_available}`);
  if (restoredVehicle?.count_available !== 1) {
    throw new Error(`Expected restored count to be 1, got ${restoredVehicle?.count_available}`);
  }

  console.log('\n🏆 ALL RACE CONDITION AND ATOMIC INVENTORY CONSTRAINTS PASSED!\n');
}

runRaceConditionTest().catch((err) => {
  console.error('❌ Race condition test failed:', err);
  process.exit(1);
});
