import { seedDatabase } from '../lib/seed-data';

console.log('🌱 Seeding Vuela Ya Colombian domestic airline database...');
const startTime = Date.now();

try {
  const result = seedDatabase();
  const elapsed = Date.now() - startTime;
  console.log(`✅ Successfully seeded database in ${elapsed}ms:`);
  console.log(`   - Airports: ${result.airportsCount}`);
  console.log(`   - Flights: ${result.flightsCount}`);
  console.log(`   - Seats: ${result.seatsCount}`);
  process.exit(0);
} catch (error) {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
}
