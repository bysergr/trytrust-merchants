import { getDatabase, resetDatabase } from '../lib/db';

console.log('🌱 Seeding logistics database...');
const db = getDatabase();
resetDatabase(db);

const vehicleCount = db.prepare('SELECT COUNT(*) as c FROM vehicle_types').get() as { c: number };
const availCount = db.prepare('SELECT COUNT(*) as c FROM available_vehicles').get() as { c: number };
const reqCount = db.prepare('SELECT COUNT(*) as c FROM service_requests').get() as { c: number };

console.log(`✅ Seed complete:`);
console.log(`   - ${vehicleCount.c} vehicle types`);
console.log(`   - ${availCount.c} inventory pool entries`);
console.log(`   - ${reqCount.c} initial service requests`);
