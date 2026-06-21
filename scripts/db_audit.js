/**
 * Sai Nirvana Plaza — Comprehensive Database Audit Script
 * READ-ONLY — No INSERT / UPDATE / DELETE / ALTER operations.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 3
});

const q = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const issues = [];
const addIssue = (severity, category, description, table, fix, sql = '') =>
  issues.push({ severity, category, description, table, fix, sql });

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  SAI NIRVANA PLAZA — DATABASE AUDIT REPORT                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── 1. TABLE INVENTORY ────────────────────────────────────────────────────────
console.log('━━━ 1. TABLE INVENTORY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const tables = await q(`SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH,
  ROUND((DATA_LENGTH + INDEX_LENGTH)/1024, 2) AS size_kb, ENGINE, TABLE_COLLATION
  FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
  [process.env.MYSQL_DATABASE]);
tables.forEach(t =>
  console.log(`  ${t.TABLE_NAME.padEnd(35)} rows≈${String(t.TABLE_ROWS||0).padStart(5)}  ${t.size_kb} KB  [${t.ENGINE}]`));

// ── 2. SCHEMA — COLUMNS & CONSTRAINTS ────────────────────────────────────────
console.log('\n━━━ 2. PRIMARY KEYS & AUTO-INCREMENT ━━━━━━━━━━━━━━━━━━━━━━━━━━');
const pks = await q(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, EXTRA
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = ? AND COLUMN_KEY = 'PRI'
  ORDER BY TABLE_NAME`, [process.env.MYSQL_DATABASE]);
pks.forEach(p => console.log(`  ${p.TABLE_NAME}.${p.COLUMN_NAME}  [${p.COLUMN_TYPE}]  ${p.EXTRA}`));

const tablesWithoutPK = tables
  .map(t => t.TABLE_NAME)
  .filter(tn => !pks.some(p => p.TABLE_NAME === tn));
if (tablesWithoutPK.length) {
  console.log(`\n  ⚠ Tables WITHOUT primary key: ${tablesWithoutPK.join(', ')}`);
  addIssue('HIGH','Schema','Tables missing primary keys', tablesWithoutPK.join(', '),
    'Add PRIMARY KEY constraints to all tables');
}

console.log('\n━━━ 3. FOREIGN KEYS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const fks = await q(`SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME,
  CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
  ORDER BY TABLE_NAME`, [process.env.MYSQL_DATABASE]);
if (fks.length === 0) {
  console.log('  ⚠  NO FOREIGN KEYS defined in schema.');
  addIssue('MEDIUM','Schema','No FOREIGN KEY constraints defined — referential integrity enforced only at application level',
    'All tables','Add FK constraints for bookings→guests, bookings→rooms, active_stays→bookings etc.',
    'SELECT * FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME IS NOT NULL');
} else {
  fks.forEach(f => console.log(`  ${f.TABLE_NAME}.${f.COLUMN_NAME} → ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME}`));
}

console.log('\n━━━ 4. INDEXES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const indexes = await q(`SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = ?
  ORDER BY TABLE_NAME, INDEX_NAME`, [process.env.MYSQL_DATABASE]);
const indexGroups = {};
indexes.forEach(i => {
  if (!indexGroups[i.TABLE_NAME]) indexGroups[i.TABLE_NAME] = new Set();
  indexGroups[i.TABLE_NAME].add(i.INDEX_NAME);
});
Object.entries(indexGroups).forEach(([t, idxSet]) =>
  console.log(`  ${t.padEnd(35)} indexes: ${[...idxSet].join(', ')}`));

// ── 3. ROW COUNTS ─────────────────────────────────────────────────────────────
console.log('\n━━━ 5. EXACT ROW COUNTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const tablenames = tables.map(t => t.TABLE_NAME);
const counts = {};
for (const tn of tablenames) {
  try {
    const r = await q(`SELECT COUNT(*) AS cnt FROM \`${tn}\``);
    counts[tn] = r[0].cnt;
    console.log(`  ${tn.padEnd(35)} ${counts[tn]} rows`);
  } catch(e) { console.log(`  ${tn}: ERROR ${e.message}`); }
}

// ── 4. ROOM INVENTORY ─────────────────────────────────────────────────────────
console.log('\n━━━ 6. ROOM INVENTORY & OCCUPANCY ━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const roomStats = await q(`SELECT room_status, COUNT(*) AS cnt FROM rooms GROUP BY room_status`);
const totalRooms = roomStats.reduce((s,r) => s+Number(r.cnt), 0);
roomStats.forEach(r => console.log(`  ${r.room_status.padEnd(15)} ${r.cnt}`));
const occupiedCount = Number((roomStats.find(r=>r.room_status==='Occupied')||{cnt:0}).cnt);
const availableCount = Number((roomStats.find(r=>r.room_status==='Available')||{cnt:0}).cnt);
const dirtyCount = Number((roomStats.find(r=>r.room_status==='Dirty')||{cnt:0}).cnt);
const maintCount = Number((roomStats.find(r=>r.room_status==='Maintenance')||{cnt:0}).cnt);
const occRate = totalRooms > 0 ? ((occupiedCount/totalRooms)*100).toFixed(1) : 0;
console.log(`\n  Total Rooms: ${totalRooms}`);
console.log(`  Occupied   : ${occupiedCount}`);
console.log(`  Available  : ${availableCount}`);
console.log(`  Dirty      : ${dirtyCount}`);
console.log(`  Maintenance: ${maintCount}`);
console.log(`  Occupancy Rate: ${occRate}%`);

// ── 5. BOOKING INTEGRITY ──────────────────────────────────────────────────────
console.log('\n━━━ 7. BOOKING INTEGRITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const bookingStatuses = await q(`SELECT booking_status, COUNT(*) AS cnt FROM bookings GROUP BY booking_status`);
bookingStatuses.forEach(b => console.log(`  ${b.booking_status.padEnd(20)} ${b.cnt}`));

// Bookings with no guest
const orphanBookings = await q(`SELECT b.booking_id, b.guest_id FROM bookings b
  LEFT JOIN guests g ON b.guest_id = g.guest_id WHERE g.guest_id IS NULL`);
console.log(`\n  Bookings with missing guest record: ${orphanBookings.length}`);
if (orphanBookings.length) {
  addIssue('HIGH','Integrity','Bookings referencing non-existent guests','bookings',
    'Investigate guest_id values: '+orphanBookings.map(b=>b.booking_id).join(','),
    'SELECT b.booking_id, b.guest_id FROM bookings b LEFT JOIN guests g ON b.guest_id=g.guest_id WHERE g.guest_id IS NULL');
}

// Bookings with no room
const orphanRoomBookings = await q(`SELECT b.booking_id, b.room_id FROM bookings b
  LEFT JOIN rooms r ON b.room_id = r.room_id WHERE r.room_id IS NULL`);
console.log(`  Bookings with missing room record  : ${orphanRoomBookings.length}`);
if (orphanRoomBookings.length) {
  addIssue('HIGH','Integrity','Bookings referencing non-existent rooms','bookings',
    'Check room_ids: '+orphanRoomBookings.map(b=>b.booking_id).join(','),
    'SELECT b.booking_id, b.room_id FROM bookings b LEFT JOIN rooms r ON b.room_id=r.room_id WHERE r.room_id IS NULL');
}

// Checked-In bookings without active_stay
const checkedInNoStay = await q(`SELECT b.booking_id, b.guest_id, b.room_id FROM bookings b
  LEFT JOIN active_stays a ON b.booking_id = a.booking_id
  WHERE b.booking_status = 'Checked-In' AND a.stay_id IS NULL`);
console.log(`  Checked-In bookings without active_stay: ${checkedInNoStay.length}`);
if (checkedInNoStay.length) {
  addIssue('HIGH','Integrity','Checked-In bookings have no active_stays record','bookings, active_stays',
    'Create missing active_stays records for booking_ids: '+checkedInNoStay.map(b=>b.booking_id).join(','),
    'SELECT b.booking_id FROM bookings b LEFT JOIN active_stays a ON b.booking_id=a.booking_id WHERE b.booking_status=\'Checked-In\' AND a.stay_id IS NULL');
}

// Multiple active stays per room
const multiStay = await q(`SELECT room_id, COUNT(*) AS cnt FROM active_stays GROUP BY room_id HAVING cnt > 1`);
console.log(`  Rooms with multiple active stays   : ${multiStay.length}`);
if (multiStay.length) {
  addIssue('CRITICAL','Integrity','Multiple active stays for same room — double-booking risk','active_stays',
    'Investigate and resolve room_ids: '+multiStay.map(r=>r.room_id).join(','),
    'SELECT room_id, COUNT(*) FROM active_stays GROUP BY room_id HAVING COUNT(*) > 1');
}

// Occupied rooms without active stay
const occupiedNoStay = await q(`SELECT r.room_id, r.room_number FROM rooms r
  LEFT JOIN active_stays a ON r.room_id = a.room_id
  WHERE r.room_status = 'Occupied' AND a.stay_id IS NULL`);
console.log(`  Occupied rooms without active_stay : ${occupiedNoStay.length}`);
if (occupiedNoStay.length) {
  addIssue('MEDIUM','Integrity','Room marked Occupied but no active_stays record exists','rooms, active_stays',
    'Investigate rooms: '+occupiedNoStay.map(r=>r.room_number).join(', '),
    'SELECT r.room_number FROM rooms r LEFT JOIN active_stays a ON r.room_id=a.room_id WHERE r.room_status=\'Occupied\' AND a.stay_id IS NULL');
}

// Available rooms with active stay
const availableWithStay = await q(`SELECT r.room_id, r.room_number FROM rooms r
  JOIN active_stays a ON r.room_id = a.room_id
  WHERE r.room_status = 'Available'`);
console.log(`  Available rooms WITH active_stay   : ${availableWithStay.length}`);
if (availableWithStay.length) {
  addIssue('HIGH','Integrity','Room marked Available but still has an active_stays record','rooms, active_stays',
    'Verify room_ids: '+availableWithStay.map(r=>r.room_number).join(', '),
    'SELECT r.room_number FROM rooms r JOIN active_stays a ON r.room_id=a.room_id WHERE r.room_status=\'Available\'');
}

// Duplicate bookings (same guest, same room, same dates)
const dupBookings = await q(`SELECT guest_id, room_id, check_in_date, check_out_date, COUNT(*) AS cnt
  FROM bookings GROUP BY guest_id, room_id, check_in_date, check_out_date HAVING cnt > 1`);
console.log(`  Duplicate bookings (same guest+room+dates): ${dupBookings.length}`);
if (dupBookings.length) {
  addIssue('HIGH','Duplicates','Duplicate booking records found','bookings',
    'Review and remove duplicate bookings',
    'SELECT guest_id,room_id,check_in_date,COUNT(*) FROM bookings GROUP BY guest_id,room_id,check_in_date HAVING COUNT(*)>1');
}

// ── 6. GUEST ACCOUNT INTEGRITY ────────────────────────────────────────────────
console.log('\n━━━ 8. GUEST ACCOUNT INTEGRITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const dupEmails = await q(`SELECT email, COUNT(*) AS cnt FROM guest_accounts GROUP BY email HAVING cnt > 1`);
console.log(`  Duplicate emails in guest_accounts : ${dupEmails.length}`);
if (dupEmails.length) {
  dupEmails.forEach(d => console.log(`    → ${d.email} (${d.cnt}x)`));
  addIssue('HIGH','Duplicates','Duplicate email addresses in guest_accounts','guest_accounts',
    'Add UNIQUE constraint on email column and deduplicate',
    'SELECT email, COUNT(*) FROM guest_accounts GROUP BY email HAVING COUNT(*) > 1');
}

const dupUsernames = await q(`SELECT username, COUNT(*) AS cnt FROM guest_accounts GROUP BY username HAVING cnt > 1`);
console.log(`  Duplicate usernames                : ${dupUsernames.length}`);
if (dupUsernames.length) {
  addIssue('HIGH','Duplicates','Duplicate usernames in guest_accounts','guest_accounts',
    'Add UNIQUE constraint on username',
    'SELECT username, COUNT(*) FROM guest_accounts GROUP BY username HAVING COUNT(*) > 1');
}

// guest_accounts without guest profile
const accountsNoGuest = await q(`SELECT ga.account_id, ga.email FROM guest_accounts ga
  LEFT JOIN guests g ON LOWER(ga.email) = LOWER(g.email) WHERE g.guest_id IS NULL`);
console.log(`  Accounts without guest profile     : ${accountsNoGuest.length}`);
if (accountsNoGuest.length) {
  addIssue('MEDIUM','Integrity','guest_accounts records with no matching guests row','guest_accounts, guests',
    'Create guest records or link accounts to existing guests',
    'SELECT ga.email FROM guest_accounts ga LEFT JOIN guests g ON LOWER(ga.email)=LOWER(g.email) WHERE g.guest_id IS NULL');
}

// ── 7. PAYMENT INTEGRITY ──────────────────────────────────────────────────────
console.log('\n━━━ 9. PAYMENT INTEGRITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const paymentStats = await q(`SELECT payment_status, COUNT(*) AS cnt, SUM(amount) AS total FROM payments GROUP BY payment_status`);
paymentStats.forEach(p => console.log(`  ${p.payment_status.padEnd(15)} cnt=${p.cnt}  total=₹${Number(p.total||0).toLocaleString('en-IN')}`));

const orphanPayments = await q(`SELECT p.payment_id, p.booking_id FROM payments p
  LEFT JOIN bookings b ON p.booking_id = b.booking_id WHERE b.booking_id IS NULL`);
console.log(`  Payments with missing booking      : ${orphanPayments.length}`);
if (orphanPayments.length) {
  addIssue('HIGH','Integrity','Payment records reference non-existent bookings','payments',
    'Investigate payment_ids: '+orphanPayments.map(p=>p.payment_id).join(','),
    'SELECT p.payment_id FROM payments p LEFT JOIN bookings b ON p.booking_id=b.booking_id WHERE b.booking_id IS NULL');
}

const dupPayments = await q(`SELECT booking_id, COUNT(*) AS cnt FROM payments WHERE payment_status = 'Paid'
  GROUP BY booking_id HAVING cnt > 1`);
console.log(`  Bookings with multiple Paid payments: ${dupPayments.length}`);
if (dupPayments.length) {
  addIssue('HIGH','Duplicates','Multiple Paid payment records for same booking','payments',
    'Verify booking_ids: '+dupPayments.map(p=>p.booking_id).join(','),
    'SELECT booking_id,COUNT(*) FROM payments WHERE payment_status=\'Paid\' GROUP BY booking_id HAVING COUNT(*)>1');
}

// Negative or zero amount payments
const badAmounts = await q(`SELECT payment_id, booking_id, amount FROM payments WHERE amount <= 0`);
console.log(`  Invalid amount payments (<=0)      : ${badAmounts.length}`);
if (badAmounts.length) {
  addIssue('HIGH','DataQuality','Payments with zero or negative amounts','payments',
    'Investigate payment_ids: '+badAmounts.map(p=>p.payment_id).join(','),
    'SELECT payment_id,amount FROM payments WHERE amount<=0');
}

// ── 8. HOUSEKEEPING INTEGRITY ─────────────────────────────────────────────────
console.log('\n━━━ 10. HOUSEKEEPING INTEGRITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const hkStats = await q(`SELECT status, COUNT(*) AS cnt FROM housekeeping GROUP BY status`);
hkStats.forEach(h => console.log(`  ${h.status.padEnd(20)} ${h.cnt}`));

const orphanHK = await q(`SELECT h.task_id, h.room_id FROM housekeeping h
  LEFT JOIN rooms r ON h.room_id = r.room_id WHERE r.room_id IS NULL`);
console.log(`  Housekeeping with missing room     : ${orphanHK.length}`);
if (orphanHK.length) {
  addIssue('MEDIUM','Integrity','Housekeeping tasks reference invalid room_ids','housekeeping',
    'Clean up orphan housekeeping records',
    'SELECT task_id FROM housekeeping h LEFT JOIN rooms r ON h.room_id=r.room_id WHERE r.room_id IS NULL');
}

// ── 9. COMMUNICATION / AUTH AUDIT ─────────────────────────────────────────────
console.log('\n━━━ 11. AUTHENTICATION AUDIT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const authCols = await q(`SHOW COLUMNS FROM guest_accounts`);
  authCols.forEach(c => {
    if (['password','password_hash','pin','pin_hash'].includes(c.Field.toLowerCase())) {
      console.log(`  Auth column: ${c.Field}  [${c.Type}]  Null:${c.Null}`);
    }
  });

  // Check for likely plain-text passwords (very short = possible numeric PIN, or long = hash)
  const shortPasswords = await q(`SELECT COUNT(*) AS cnt FROM guest_accounts
    WHERE LENGTH(password_hash) < 32`).catch(() => [{cnt:'N/A'}]);
  console.log(`  Accounts with password_hash < 32 chars (possible plain-text): ${shortPasswords[0].cnt}`);
  if (Number(shortPasswords[0].cnt) > 0) {
    addIssue('CRITICAL','Security','Guest accounts may have plain-text or weak passwords','guest_accounts',
      'Re-hash all passwords using SHA-256 or bcrypt',
      "SELECT COUNT(*) FROM guest_accounts WHERE LENGTH(password_hash) < 32");
  }

  const inactiveAccounts = await q(`SELECT COUNT(*) AS cnt FROM guest_accounts WHERE is_active = 0`);
  console.log(`  Inactive accounts                  : ${inactiveAccounts[0].cnt}`);

  const firstLoginNotChanged = await q(`SELECT COUNT(*) AS cnt FROM guest_accounts
    WHERE first_login_changed = 0`).catch(() => [{cnt:'N/A'}]);
  console.log(`  Accounts pending first-login change: ${firstLoginNotChanged[0].cnt}`);
} catch(e) {
  console.log(`  Could not audit guest_accounts: ${e.message}`);
}

console.log('\n━━━ 12. COMMUNICATION AUDIT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const commStats = await q(`SELECT channel, status, COUNT(*) AS cnt
    FROM communication_history GROUP BY channel, status ORDER BY channel, status`);
  commStats.forEach(c => console.log(`  [${c.channel}] ${c.status.padEnd(10)} ${c.cnt}`));

  const orphanComm = await q(`SELECT ch.log_id FROM communication_history ch
    LEFT JOIN bookings b ON ch.booking_id = b.booking_id WHERE b.booking_id IS NULL AND ch.booking_id IS NOT NULL`);
  console.log(`  Communication logs with missing booking: ${orphanComm.length}`);
  if (orphanComm.length) {
    addIssue('LOW','Integrity','Communication history references non-existent bookings','communication_history',
      'Nullable booking_id is acceptable but review these orphan records',
      'SELECT log_id FROM communication_history ch LEFT JOIN bookings b ON ch.booking_id=b.booking_id WHERE b.booking_id IS NULL AND ch.booking_id IS NOT NULL');
  }

  // Bookings without any communication
  const bookingsNoComm = await q(`SELECT COUNT(*) AS cnt FROM bookings b
    LEFT JOIN communication_history ch ON b.booking_id = ch.booking_id
    WHERE ch.log_id IS NULL AND b.booking_status NOT IN ('Cancelled')`);
  console.log(`  Active bookings with no comms record: ${bookingsNoComm[0].cnt}`);
  if (Number(bookingsNoComm[0].cnt) > 0) {
    addIssue('LOW','Communication','Some bookings have no communication history','bookings, communication_history',
      'Verify confirmations were sent; resend if needed',
      "SELECT COUNT(*) FROM bookings b LEFT JOIN communication_history ch ON b.booking_id=ch.booking_id WHERE ch.log_id IS NULL AND b.booking_status NOT IN ('Cancelled')");
  }
} catch(e) {
  console.log(`  Could not audit communication_history: ${e.message}`);
}

// ── 10. DATA QUALITY ──────────────────────────────────────────────────────────
console.log('\n━━━ 13. DATA QUALITY CHECKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
// Invalid email formats
const badEmails = await q(`SELECT COUNT(*) AS cnt FROM guests
  WHERE email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND email IS NOT NULL AND email <> ''`);
console.log(`  Guests with invalid email format   : ${badEmails[0].cnt}`);
if (Number(badEmails[0].cnt) > 0) {
  addIssue('MEDIUM','DataQuality','Guests with malformed email addresses','guests',
    'Validate and correct guest emails',
    "SELECT guest_id,email FROM guests WHERE email NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\\\.[A-Za-z]{2,}$'");
}

// Invalid phone numbers (too short)
const badPhones = await q(`SELECT COUNT(*) AS cnt FROM guests
  WHERE mobile_number IS NOT NULL AND LENGTH(REGEXP_REPLACE(mobile_number,'[^0-9]','')) < 10`);
console.log(`  Guests with short phone numbers    : ${badPhones[0].cnt}`);
if (Number(badPhones[0].cnt) > 0) {
  addIssue('LOW','DataQuality','Guests with short/invalid phone numbers','guests',
    'Review and correct mobile_number values',
    "SELECT guest_id,mobile_number FROM guests WHERE LENGTH(REGEXP_REPLACE(mobile_number,'[^0-9]','')) < 10");
}

// Bookings with check-out before check-in
const badDates = await q(`SELECT COUNT(*) AS cnt FROM bookings WHERE check_out_date <= check_in_date`);
console.log(`  Bookings with invalid date range   : ${badDates[0].cnt}`);
if (Number(badDates[0].cnt) > 0) {
  addIssue('HIGH','DataQuality','Bookings where check_out_date <= check_in_date','bookings',
    'Correct invalid date ranges',
    'SELECT booking_id,check_in_date,check_out_date FROM bookings WHERE check_out_date<=check_in_date');
}

// Null required fields in bookings
const nullGuestBookings = await q(`SELECT COUNT(*) AS cnt FROM bookings WHERE guest_id IS NULL`);
console.log(`  Bookings with NULL guest_id        : ${nullGuestBookings[0].cnt}`);

// Null room_id in bookings
const nullRoomBookings = await q(`SELECT COUNT(*) AS cnt FROM bookings WHERE room_id IS NULL`);
console.log(`  Bookings with NULL room_id         : ${nullRoomBookings[0].cnt}`);
if (Number(nullRoomBookings[0].cnt) > 0) {
  addIssue('HIGH','DataQuality','Bookings with NULL room_id','bookings',
    'All bookings must reference a valid room',
    'SELECT booking_id FROM bookings WHERE room_id IS NULL');
}

// ── 11. PERFORMANCE — MISSING INDEXES ────────────────────────────────────────
console.log('\n━━━ 14. PERFORMANCE — MISSING INDEXES ━━━━━━━━━━━━━━━━━━━━━━━');
const indexedCols = new Set(indexes.map(i => `${i.TABLE_NAME}.${i.COLUMN_NAME}`));
const criticalIndexCols = [
  ['bookings','guest_id'], ['bookings','room_id'], ['bookings','booking_status'],
  ['active_stays','room_id'], ['active_stays','booking_id'],
  ['payments','booking_id'], ['payments','payment_status'],
  ['housekeeping','room_id'], ['housekeeping','status'],
  ['complaints','guest_id'], ['complaints','room_id'],
  ['room_service_requests','booking_id'], ['room_service_requests','status'],
  ['communication_history','booking_id'], ['guests','email'],
  ['guest_accounts','email'], ['guest_accounts','username'],
];
criticalIndexCols.forEach(([tbl, col]) => {
  const hasIdx = indexedCols.has(`${tbl}.${col}`);
  const sym = hasIdx ? '✓' : '✗';
  if (!hasIdx) {
    console.log(`  ${sym} MISSING  ${tbl}.${col}`);
    addIssue('MEDIUM','Performance',`Missing index on ${tbl}(${col})`,tbl,
      `CREATE INDEX idx_${tbl}_${col} ON ${tbl}(${col});`,
      `SHOW INDEX FROM ${tbl}`);
  } else {
    console.log(`  ${sym} OK       ${tbl}.${col}`);
  }
});

// ── 12. COMPLAINTS & SERVICE REQUESTS ────────────────────────────────────────
console.log('\n━━━ 15. COMPLAINTS & SERVICE REQUESTS ━━━━━━━━━━━━━━━━━━━━━━━');
try {
  const compStats = await q(`SELECT complaint_status, COUNT(*) AS cnt FROM complaints GROUP BY complaint_status`);
  compStats.forEach(c => console.log(`  Complaints [${c.complaint_status}]: ${c.cnt}`));
  const rsStats = await q(`SELECT status, COUNT(*) AS cnt FROM room_service_requests GROUP BY status`);
  rsStats.forEach(r => console.log(`  Room Service [${r.status}]: ${r.cnt}`));
} catch(e) { console.log(`  ${e.message}`); }

// ── 13. SUMMARY ISSUES REPORT ─────────────────────────────────────────────────
console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  AUDIT ISSUES SUMMARY                                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

const sevOrder = { CRITICAL:0, HIGH:1, MEDIUM:2, LOW:3 };
issues.sort((a,b) => sevOrder[a.severity] - sevOrder[b.severity]);

const criticals = issues.filter(i=>i.severity==='CRITICAL');
const highs     = issues.filter(i=>i.severity==='HIGH');
const mediums   = issues.filter(i=>i.severity==='MEDIUM');
const lows      = issues.filter(i=>i.severity==='LOW');

const total = issues.length;
const healthScore = Math.max(0, Math.round(100 - criticals.length*25 - highs.length*10 - mediums.length*4 - lows.length*1));

console.log(`\n  🏥 DATABASE HEALTH SCORE: ${healthScore}/100`);
console.log(`\n  CRITICAL : ${criticals.length}`);
console.log(`  HIGH     : ${highs.length}`);
console.log(`  MEDIUM   : ${mediums.length}`);
console.log(`  LOW      : ${lows.length}`);
console.log(`  TOTAL    : ${total} issues\n`);

issues.forEach((issue, i) => {
  const emoji = { CRITICAL:'🔴', HIGH:'🟠', MEDIUM:'🟡', LOW:'🟢' }[issue.severity];
  console.log(`${emoji} [${issue.severity}] [${issue.category}] ${issue.description}`);
  console.log(`   Table: ${issue.table}`);
  console.log(`   Fix  : ${issue.fix}`);
  if (issue.sql) console.log(`   SQL  : ${issue.sql.substring(0,120)}`);
  console.log('');
});

console.log(`\n  Occupancy Summary:`);
console.log(`    Total Rooms   : ${totalRooms}`);
console.log(`    Occupied      : ${occupiedCount}`);
console.log(`    Available     : ${availableCount}`);
console.log(`    Dirty         : ${dirtyCount}`);
console.log(`    Maintenance   : ${maintCount}`);
console.log(`    Occupancy Rate: ${occRate}%`);

await pool.end();
console.log('\n[Audit Complete] Database connection closed.\n');
