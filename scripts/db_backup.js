/**
 * Sai Nirvana Plaza — Pre-Remediation Backup Script
 * Fetches and saves all database records scheduled for modification.
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE, ssl: { rejectUnauthorized: false }
});

const q = async (sql, p=[]) => { const [r] = await pool.execute(sql, p); return r; };

try {
  console.log('Starting pre-remediation backup...');

  // 1. Affected bookings (booking 3 and 4)
  const bookings = await q('SELECT * FROM bookings WHERE booking_id IN (3, 4)');
  console.log(`Fetched ${bookings.length} affected bookings.`);

  // 2. Guest accounts (specifically plain text password records)
  const guestAccounts = await q('SELECT account_id, email, username, password_hash, is_activated, first_login_password_changed, created_at FROM guest_accounts WHERE LENGTH(password_hash) != 64');
  console.log(`Fetched ${guestAccounts.length} guest accounts with plain-text passwords.`);

  // 3. Active stays for affected bookings
  const activeStays = await q('SELECT * FROM active_stays WHERE booking_id IN (3, 4)');
  console.log(`Fetched ${activeStays.length} active stay records for affected bookings.`);

  // 4. Room status corrections
  const rooms = await q('SELECT room_id, room_number, room_type, room_status FROM rooms WHERE room_number IN ("102", "104", "107", "110", "111", "113", "301", "404", "407", "410")');
  console.log(`Fetched ${rooms.length} room status records target for correction.`);

  // 5. Existing indexes for modified tables to have as reference
  const indexRooms = await q('SHOW INDEX FROM rooms');
  const indexHousekeeping = await q('SHOW INDEX FROM housekeeping');

  const backupData = {
    backup_timestamp: new Date().toISOString(),
    affected_bookings: bookings,
    affected_guest_accounts: guestAccounts,
    affected_active_stays: activeStays,
    affected_rooms: rooms,
    indexes_reference: {
      rooms: indexRooms,
      housekeeping: indexHousekeeping
    }
  };

  const backupPath = 'C:\\Users\\ABHI\\.gemini\\antigravity-ide\\brain\\c7dbf128-8ff7-4f69-a4e0-ef3cab260f5f\\backup_pre_remediation.json';
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\nBackup saved successfully to: ${backupPath}`);

} catch (err) {
  console.error('Backup failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
