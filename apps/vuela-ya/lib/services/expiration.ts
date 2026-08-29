import { getDatabase } from '../db';
import Database from 'better-sqlite3';

export function expireStaleHolds(customDb?: Database.Database): number {
  const db = customDb || getDatabase();
  const nowIso = new Date().toISOString();

  // Find all seats where status is 'held' and held_until has passed
  const releaseExpiredStmt = db.prepare(`
    UPDATE seats
    SET status = 'available',
        held_until = NULL,
        version = version + 1
    WHERE status = 'held'
      AND held_until IS NOT NULL
      AND held_until <= ?
  `);

  // Clean up booking_seats linking to now available seats if their hold expired
  const cleanupBookingSeatsStmt = db.prepare(`
    DELETE FROM booking_seats
    WHERE seat_id IN (
      SELECT id FROM seats WHERE status = 'available'
    )
    AND booking_id IN (
      SELECT id FROM bookings WHERE status IN ('draft', 'pending_payment')
    )
  `);

  // Mark draft bookings with 0 seats remaining as expired
  const updateEmptyBookingsStmt = db.prepare(`
    UPDATE bookings
    SET status = 'expired'
    WHERE status IN ('draft', 'pending_payment')
      AND id NOT IN (SELECT DISTINCT booking_id FROM booking_seats)
      AND datetime(created_at, '+15 minutes') <= datetime(?)
  `);

  let releasedCount = 0;

  const runExpiration = db.transaction(() => {
    const info = releaseExpiredStmt.run(nowIso);
    releasedCount = info.changes;
    if (releasedCount > 0) {
      cleanupBookingSeatsStmt.run();
      updateEmptyBookingsStmt.run(nowIso);
    }
  });

  runExpiration();
  return releasedCount;
}
