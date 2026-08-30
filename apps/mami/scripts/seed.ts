import { getDatabase, resetDatabase } from '../lib/db';

export function seed() {
  const db = getDatabase();
  console.log('[Database] Resetting and seeding database tables...');
  resetDatabase(db);
  console.log('[Database] Successfully initialized and seeded database!');
}

// Run directly if executed as a script
if (require.main === module || process.argv[1]?.includes('seed')) {
  seed();
}
