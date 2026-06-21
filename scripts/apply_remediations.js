/**
 * Sai Nirvana Plaza — Database Remediation & Integrity Fixes
 * Applies all approved fixes and database schema updates.
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE, ssl: { rejectUnauthorized: false }
});

const q = async (sql, p=[]) => { const [r] = await pool.query(sql, p); return r; };

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function addIndexIfNotExist(tableName, indexName, columns) {
  try {
    const dbName = process.env.MYSQL_DATABASE;
    const statistics = await q(
      'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
      [dbName, tableName, indexName]
    );

    if (statistics.length === 0) {
      console.log(`[Schema] Index ${indexName} does not exist on table ${tableName}. Adding it...`);
      await q(`ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columns})`);
      console.log(`[Schema] Successfully added index ${indexName} on ${tableName}(${columns}).`);
    } else {
      console.log(`[Schema] Index ${indexName} already exists on table ${tableName}.`);
    }
  } catch (err) {
    console.error(`[Schema] Error checking/adding index ${indexName} on ${tableName}:`, err.message);
  }
}

try {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RUNNING DATABASE INTEGRITY REMEDIATIONS                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // ── 1. PASSWORD HASHING MIGRATION ──────────────────────────────────────────
  console.log('1. Migrating legacy plain-text passwords to SHA-256...');
  const legacyAccounts = await q('SELECT account_id, username, password_hash FROM guest_accounts WHERE LENGTH(password_hash) != 64');
  console.log(`   Found ${legacyAccounts.length} guest accounts with plain-text passwords.`);

  for (const acc of legacyAccounts) {
    const rawPass = acc.password_hash;
    const hashed = hashPassword(rawPass);
    await q('UPDATE guest_accounts SET password_hash = ? WHERE account_id = ?', [hashed, acc.account_id]);
    console.log(`   -> Hashed password for username=${acc.username} (account_id=${acc.account_id})`);
  }
  console.log('   Password hashing migration complete.\n');

  // ── 2. PAST-DUE CHECKED-IN BOOKINGS CORRECTION ──────────────────────────────
  console.log('2. Closing past-due Checked-In bookings (booking_id 3 & 4)...');
  const pastBookings = await q('SELECT * FROM bookings WHERE booking_id IN (3, 4) AND booking_status = "Checked-In"');
  
  for (const b of pastBookings) {
    // Check total amount from payments
    const payments = await q('SELECT SUM(amount) AS total FROM payments WHERE booking_id = ?', [b.booking_id]);
    const amount = payments[0]?.total || 0.00;

    // Start Transaction
    await q('START TRANSACTION');
    try {
      // Set status to Checked-Out
      await q('UPDATE bookings SET booking_status = "Checked-Out" WHERE booking_id = ?', [b.booking_id]);

      // Insert stay history
      await q(`
        INSERT INTO stay_history (booking_id, guest_id, room_id, check_in_date, check_out_date, status, total_amount)
        VALUES (?, ?, ?, ?, ?, "Checked-Out", ?)
        ON DUPLICATE KEY UPDATE status = "Checked-Out", total_amount = ?
      `, [b.booking_id, b.guest_id, b.room_id, b.check_in_date, b.check_out_date, amount, amount]);

      await q('COMMIT');
      console.log(`   -> Closed booking_id=${b.booking_id} (room_id=${b.room_id}) and created stay_history record.`);
    } catch (txErr) {
      await q('ROLLBACK');
      console.error(`   Error correcting booking_id=${b.booking_id}:`, txErr.message);
    }
  }
  console.log('   Checked-In bookings correction complete.\n');

  // ── 3. ORPHANED ROOM STATUS CORRECTION ──────────────────────────────────────
  console.log('3. Correcting occupied room statuses without active stays...');
  // We want to reset rooms: 102, 104, 107, 110, 111, 113, 301, 404, 407, 410 if they have no active stay
  const targetRooms = ["102", "104", "107", "110", "111", "113", "301", "404", "407", "410"];
  
  for (const roomNum of targetRooms) {
    const rooms = await q('SELECT room_id, room_status FROM rooms WHERE room_number = ?', [roomNum]);
    if (rooms.length > 0) {
      const room = rooms[0];
      const activeStays = await q('SELECT stay_id FROM active_stays WHERE room_id = ?', [room.room_id]);
      
      if (activeStays.length === 0 && room.room_status === 'Occupied') {
        await q('UPDATE rooms SET room_status = "Available" WHERE room_id = ?', [room.room_id]);
        console.log(`   -> Reset Room ${roomNum} status to Available (had no active stays).`);
      } else if (activeStays.length > 0) {
        console.log(`   -> Room ${roomNum} skipped (has active stay with stay_id=${activeStays[0].stay_id}).`);
      } else {
        console.log(`   -> Room ${roomNum} skipped (status is already ${room.room_status}).`);
      }
    }
  }
  console.log('   Room status corrections complete.\n');

  // ── 4. PERFORMANCE INDEXES CREATION ──────────────────────────────────────────
  console.log('4. Creating performance indexes...');
  await addIndexIfNotExist('rooms', 'idx_room_status', '`room_status`');
  await addIndexIfNotExist('housekeeping', 'idx_housekeeping_status', '`task_status`');
  await addIndexIfNotExist('payments', 'idx_payment_status', '`payment_status`');
  await addIndexIfNotExist('room_service_requests', 'idx_room_service_status', '`request_status`');
  await addIndexIfNotExist('guest_accounts', 'idx_guest_accounts_activated', '`is_activated`');
  console.log('   Index creation complete.\n');

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DATABASE INTEGRITY REMEDIATIONS SUCCESSFULLY APPLIED       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

} catch (err) {
  console.error('Remediation run encountered error:', err);
  process.exit(1);
} finally {
  await pool.end();
}
