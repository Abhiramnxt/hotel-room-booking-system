import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE, ssl: { rejectUnauthorized: false }
});
const q = async (sql, p=[]) => { const [r] = await pool.execute(sql,p); return r; };

console.log('=== COLUMN MAPS ===');
const hkCols = await q('SHOW COLUMNS FROM housekeeping');
console.log('housekeeping:', hkCols.map(c=>c.Field).join(', '));
const gaCols = await q('SHOW COLUMNS FROM guest_accounts');
console.log('guest_accounts:', gaCols.map(c=>c.Field).join(', '));
const rsCols = await q('SHOW COLUMNS FROM room_service_requests');
console.log('room_service_requests:', rsCols.map(c=>c.Field).join(', '));
const chCols = await q('SHOW COLUMNS FROM communication_history');
console.log('communication_history:', chCols.map(c=>c.Field).join(', '));

console.log('\n=== HOUSEKEEPING STATUS BREAKDOWN ===');
const hkStatus = await q('SELECT task_status, COUNT(*) AS cnt FROM housekeeping GROUP BY task_status');
console.log(JSON.stringify(hkStatus));

console.log('\n=== CHECKED-IN WITHOUT ACTIVE_STAY ===');
const ciNoStay = await q("SELECT b.booking_id, b.guest_id, b.room_id FROM bookings b LEFT JOIN active_stays a ON b.booking_id = a.booking_id WHERE b.booking_status = 'Checked-In' AND a.stay_id IS NULL");
console.log(JSON.stringify(ciNoStay));

console.log('\n=== OCCUPIED ROOMS WITHOUT STAY RECORD ===');
const occNoStay = await q("SELECT r.room_id, r.room_number FROM rooms r LEFT JOIN active_stays a ON r.room_id = a.room_id WHERE r.room_status = 'Occupied' AND a.stay_id IS NULL");
console.log(JSON.stringify(occNoStay));

console.log('\n=== GUEST ACCOUNTS AUTH CHECK ===')
const auth = await q('SELECT account_id, email, LENGTH(password_hash) as pw_len, is_activated, first_login_password_changed FROM guest_accounts');
console.log(JSON.stringify(auth));

console.log('\n=== COMMUNICATION HISTORY STATS ===')
try {
  const commStats = await q('SELECT communication_type, channel, COUNT(*) AS cnt FROM communication_history GROUP BY communication_type, channel ORDER BY communication_type');
  console.log(JSON.stringify(commStats));
  // bookings without comm (communication_history has no direct booking_id col)
  console.log('NOTE: communication_history has no booking_id column — cannot check per-booking coverage');
} catch(e) { console.log('comm stat error:', e.message); }

console.log('\n=== ROOM SERVICE STATUS ===')
const rsStats = await q('SELECT request_status, COUNT(*) AS cnt FROM room_service_requests GROUP BY request_status');
console.log(JSON.stringify(rsStats));

console.log('\n=== STAY HISTORY vs CHECKED-OUT ===')
const coNoHistory = await q("SELECT b.booking_id FROM bookings b LEFT JOIN stay_history sh ON b.booking_id = sh.booking_id WHERE b.booking_status = 'Checked-Out' AND sh.history_id IS NULL");
console.log('Checked-Out with no stay_history:', JSON.stringify(coNoHistory));

console.log('\n=== MISSING INDEXES CHECK ===');
const allIdx = await q("SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, COLUMN_NAME");
const idxSet = new Set(allIdx.map(i=>`${i.TABLE_NAME}.${i.COLUMN_NAME}`));
const needed = [
  ['housekeeping','task_status'],['communication_history','guest_id_str'],
  ['guest_accounts','is_activated'],['rooms','room_status'],
  ['payments','payment_status'],['room_service_requests','request_status']
];
needed.forEach(([t,c]) => console.log(`  ${idxSet.has(`${t}.${c}`) ? '✓ HAS' : '✗ MISSING'} index on ${t}(${c})`));

await pool.end();
console.log('\n[Supplemental audit complete]');
