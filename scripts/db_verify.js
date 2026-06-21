/**
 * Sai Nirvana Plaza — Deep Verification Audit
 * READ-ONLY — No INSERT / UPDATE / DELETE / ALTER
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE, ssl: { rejectUnauthorized: false },
  waitForConnections: true, connectionLimit: 3
});
const q = async (sql, p=[]) => { const [r] = await pool.execute(sql, p); return r; };

// ── PRIORITY 1: PASSWORD SECURITY ────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  PRIORITY 1 — PASSWORD SECURITY VERIFICATION                ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

const accounts = await q(`SELECT account_id, email, username, password_hash,
  LENGTH(password_hash) AS hash_len,
  is_activated, first_login_password_changed, created_at
  FROM guest_accounts ORDER BY account_id`);

console.log('\n  All guest_accounts password_hash values:\n');
accounts.forEach(a => {
  const hashVal = a.password_hash;
  const len = a.hash_len;
  const looksHex64 = /^[a-f0-9]{64}$/i.test(hashVal);
  const looksHex32 = /^[a-f0-9]{32}$/i.test(hashVal);
  const looksBcrypt = hashVal && hashVal.startsWith('$2');
  const isNumericPin = /^\d+$/.test(hashVal);
  const verdict = looksHex64 ? 'SHA-256 HASH ✅' : looksHex32 ? 'MD5 HASH ⚠️' : looksBcrypt ? 'BCRYPT ✅' : isNumericPin ? 'NUMERIC PIN 🔴 PLAIN-TEXT' : `PLAIN-TEXT 🔴 (${len} chars)`;
  console.log(`  account_id=${a.account_id}  email=${a.email}`);
  console.log(`    username      : ${a.username}`);
  console.log(`    password_hash : "${hashVal}"`);
  console.log(`    hash_len      : ${len}`);
  console.log(`    verdict       : ${verdict}`);
  console.log(`    is_activated  : ${a.is_activated}  |  first_login_pwd_changed: ${a.first_login_password_changed}`);
  console.log('');
});

// Check what the application code does for password verification
console.log('  NOTE: Checking server-side auth pattern...');
console.log('  (See server.ts login route — does it SHA2() before comparing?)');

// Also check staff_accounts for comparison
const staff = await q(`SELECT staff_id, email, LENGTH(password_hash) AS pw_len FROM staff_accounts`).catch(()=>[]);
if (staff.length) {
  console.log('  staff_accounts password_hash lengths for comparison:');
  staff.forEach(s => console.log(`    staff_id=${s.staff_id}  email=${s.email}  pw_len=${s.pw_len}`));
}

// ── PRIORITY 2: CHECKED-IN WITHOUT ACTIVE_STAYS ───────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  PRIORITY 2 — CHECKED-IN BOOKINGS WITHOUT ACTIVE_STAYS      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

const ciNoStay = await q(`
  SELECT b.booking_id, b.booking_status,
    b.guest_id, g.full_name AS guest_name, g.email AS guest_email,
    b.room_id, r.room_number, r.room_type, r.room_status,
    b.check_in_date, b.check_out_date,
    b.created_at AS booking_created
  FROM bookings b
  LEFT JOIN guests g ON b.guest_id = g.guest_id
  LEFT JOIN rooms r ON b.room_id = r.room_id
  LEFT JOIN active_stays a ON b.booking_id = a.booking_id
  WHERE b.booking_status = 'Checked-In' AND a.stay_id IS NULL
  ORDER BY b.booking_id`);

console.log(`\n  Checked-In bookings with NO active_stay: ${ciNoStay.length}\n`);
ciNoStay.forEach(b => {
  console.log(`  booking_id    : ${b.booking_id}`);
  console.log(`  guest         : ${b.guest_name} (${b.guest_email})`);
  console.log(`  room_id       : ${b.room_id}  room_number: ${b.room_number}  room_type: ${b.room_type}`);
  console.log(`  room_status   : ${b.room_status} ← actual current room status`);
  console.log(`  check_in_date : ${b.check_in_date}  check_out_date: ${b.check_out_date}`);
  console.log(`  booking_created: ${b.booking_created}`);
  console.log('');
});

// Full list of ALL Checked-In bookings for comparison
const allCI = await q(`
  SELECT b.booking_id, b.guest_id, b.room_id, r.room_number, r.room_status,
    a.stay_id, a.check_in_at
  FROM bookings b
  LEFT JOIN rooms r ON b.room_id = r.room_id
  LEFT JOIN active_stays a ON b.booking_id = a.booking_id
  WHERE b.booking_status = 'Checked-In' ORDER BY b.booking_id`);
console.log('  All Checked-In bookings:');
allCI.forEach(b => console.log(`    booking_id=${b.booking_id}  room=${b.room_number}  room_status=${b.room_status}  stay_id=${b.stay_id || 'NULL'}`));

// Active stays cross-reference
const allStays = await q(`SELECT a.stay_id, a.booking_id, a.room_id, r.room_number, r.room_status FROM active_stays a LEFT JOIN rooms r ON a.room_id = r.room_id`);
console.log('\n  All active_stays records:');
allStays.forEach(s => console.log(`    stay_id=${s.stay_id}  booking_id=${s.booking_id}  room=${s.room_number}  room_status=${s.room_status}`));

// ── PRIORITY 3: OCCUPIED ROOMS WITHOUT ACTIVE STAYS ──────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  PRIORITY 3 — OCCUPIED ROOMS WITHOUT ACTIVE_STAYS           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

const occupiedNoStay = await q(`
  SELECT r.room_id, r.room_number, r.room_type, r.room_status,
    -- Check if there is any Checked-In booking for this room
    (SELECT b.booking_id FROM bookings b WHERE b.room_id = r.room_id AND b.booking_status = 'Checked-In' LIMIT 1) AS ci_booking_id,
    (SELECT b.guest_id FROM bookings b WHERE b.room_id = r.room_id AND b.booking_status = 'Checked-In' LIMIT 1) AS ci_guest_id,
    (SELECT g.full_name FROM bookings b LEFT JOIN guests g ON b.guest_id = g.guest_id WHERE b.room_id = r.room_id AND b.booking_status = 'Checked-In' LIMIT 1) AS ci_guest_name,
    (SELECT b.check_out_date FROM bookings b WHERE b.room_id = r.room_id AND b.booking_status = 'Checked-In' LIMIT 1) AS expected_checkout,
    -- Check latest booking status for this room
    (SELECT b.booking_status FROM bookings b WHERE b.room_id = r.room_id ORDER BY b.booking_id DESC LIMIT 1) AS latest_booking_status
  FROM rooms r
  LEFT JOIN active_stays a ON r.room_id = a.room_id
  WHERE r.room_status = 'Occupied' AND a.stay_id IS NULL
  ORDER BY r.room_number`);

console.log(`\n  Occupied rooms with NO active_stay record: ${occupiedNoStay.length}\n`);
occupiedNoStay.forEach(r => {
  const hasCI = r.ci_booking_id ? `YES — booking_id=${r.ci_booking_id}  guest=${r.ci_guest_name}  checkout=${r.expected_checkout}` : 'NO CHECKED-IN BOOKING';
  const diagnosis = r.ci_booking_id
    ? '→ MISSING active_stay for valid Checked-In booking'
    : r.latest_booking_status === 'Checked-Out' ? '→ STALE: room not reset after checkout'
    : '→ ORPHANED: no booking explains this Occupied status';
  console.log(`  Room ${r.room_number} (${r.room_type})`);
  console.log(`    Checked-In booking: ${hasCI}`);
  console.log(`    Latest booking status: ${r.latest_booking_status || 'NONE'}`);
  console.log(`    Diagnosis: ${diagnosis}`);
  console.log('');
});

// Categorize
const missingStay = occupiedNoStay.filter(r => r.ci_booking_id !== null);
const staleOccupied = occupiedNoStay.filter(r => !r.ci_booking_id && r.latest_booking_status === 'Checked-Out');
const orphaned = occupiedNoStay.filter(r => !r.ci_booking_id && r.latest_booking_status !== 'Checked-Out');
console.log(`  SUMMARY:`);
console.log(`    Rooms with valid CI booking but missing stay record: ${missingStay.length}`);
console.log(`    Rooms stale from Checked-Out (status not reset)    : ${staleOccupied.length}`);
console.log(`    Rooms orphaned (no booking justifies Occupied)      : ${orphaned.length}`);

// ── PRIORITY 4: COMMUNICATION HISTORY DESIGN ──────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  PRIORITY 4 — COMMUNICATION HISTORY DESIGN REVIEW           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
const commSample = await q(`SELECT log_id, guest_id_str, guest_name, communication_type, channel, status_info, timestamp FROM communication_history ORDER BY timestamp DESC LIMIT 10`);
console.log('\n  Latest 10 communication_history records:');
commSample.forEach(c => console.log(`    log_id=${c.log_id}  type=${c.communication_type}  ch=${c.channel}  guest_id_str=${c.guest_id_str}  name=${c.guest_name}  status=${c.status_info}`));

// What values does guest_id_str contain — is it actually a guest_id?
const guestIdStrs = await q(`SELECT DISTINCT guest_id_str FROM communication_history LIMIT 20`);
console.log('\n  Distinct guest_id_str values:', guestIdStrs.map(r=>r.guest_id_str).join(', '));

// Try to match to actual guest records
const matchTest = await q(`SELECT DISTINCT ch.guest_id_str, g.guest_id, g.full_name FROM communication_history ch LEFT JOIN guests g ON CAST(SUBSTRING(ch.guest_id_str, 8) AS UNSIGNED) = g.guest_id LIMIT 10`);
console.log('\n  guest_id_str → guests mapping:');
matchTest.forEach(m => console.log(`    guest_id_str="${m.guest_id_str}"  →  guest_id=${m.guest_id || 'NO MATCH'}  name=${m.full_name || 'N/A'}`));

// ── PRIORITY 5: INDEX IMPACT ANALYSIS ────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  PRIORITY 5 — MISSING INDEX IMPACT ANALYSIS                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// Get table row counts
const tables = ['rooms','payments','housekeeping','room_service_requests','guest_accounts','bookings'];
for (const tbl of tables) {
  const [cnt] = await q(`SELECT COUNT(*) AS cnt FROM \`${tbl}\``);
  const [statusCnt] = await q(`SELECT COUNT(DISTINCT ${tbl === 'rooms' ? 'room_status' : tbl === 'payments' ? 'payment_status' : tbl === 'housekeeping' ? 'task_status' : tbl === 'room_service_requests' ? 'request_status' : tbl === 'guest_accounts' ? 'is_activated' : 'booking_status'} ) AS dc FROM \`${tbl}\``).catch(()=>[{dc:'N/A'}]);
  console.log(`  ${tbl.padEnd(30)}  rows=${cnt.cnt}  distinct_status_vals=${statusCnt.dc}`);
}

// EXPLAIN a key query to see scan cost
console.log('\n  EXPLAIN on common dashboard query (rooms by status):');
try {
  const explain = await q(`EXPLAIN SELECT * FROM rooms WHERE room_status = 'Occupied'`);
  explain.forEach(e => console.log(`    type=${e.type}  possible_keys=${e.possible_keys}  key=${e.key}  rows=${e.rows}  Extra=${e.Extra}`));
} catch(e) { console.log('  EXPLAIN failed:', e.message); }

console.log('\n  EXPLAIN on booking status filter:');
try {
  const explain2 = await q(`EXPLAIN SELECT * FROM bookings WHERE booking_status = 'Checked-In'`);
  explain2.forEach(e => console.log(`    type=${e.type}  possible_keys=${e.possible_keys}  key=${e.key}  rows=${e.rows}  Extra=${e.Extra}`));
} catch(e) { console.log('  EXPLAIN failed:', e.message); }

console.log('\n  EXPLAIN on housekeeping task_status filter:');
try {
  const explain3 = await q(`EXPLAIN SELECT * FROM housekeeping WHERE task_status = 'Pending'`);
  explain3.forEach(e => console.log(`    type=${e.type}  possible_keys=${e.possible_keys}  key=${e.key}  rows=${e.rows}  Extra=${e.Extra}`));
} catch(e) { console.log('  EXPLAIN failed:', e.message); }

await pool.end();
console.log('\n[Verification Audit Complete]\n');
