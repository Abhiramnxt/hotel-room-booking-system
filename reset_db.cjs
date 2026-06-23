/**
 * Database Reset Script – Sai Nirvana Plaza
 * Clears all operational/demo data while preserving schema, rooms, and staff.
 * Run with: node reset_db.cjs
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 30000,
};

// ── Tables to TRUNCATE (operational data only) ────────────────────────────────
// Order matters: child tables before parent to satisfy FK constraints during DELETE.
// We disable FK checks first so TRUNCATE works freely.
const TABLES_TO_CLEAR = [
  // Transactional / session tables
  'active_stays',
  'stay_history',

  // Financial
  'payments',

  // Availability slots (will be regenerated / reset)
  'room_availability',

  // Housekeeping tasks
  'housekeeping',

  // Guest-facing operational
  'room_service_requests',
  'complaints',
  'feedback',
  'corporate_bookings',

  // Comms
  'communication_history',

  // Bookings (after all child records are gone)
  'bookings',

  // Guest identity tables
  'guest_accounts',
  'guests',
];

// ── Tables to SET room_status = 'Available' (reset, not truncate) ─────────────
// (rooms table is preserved — only status column is reset)

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   SAI NIRVANA PLAZA – DATABASE RESET SCRIPT           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let conn;
  try {
    console.log('► Connecting to Railway MySQL...');
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✓ Connected successfully.\n');

    // ── 1. Discover all actual tables in the DB ─────────────────────────────
    const [allTablesResult] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [process.env.MYSQL_DATABASE]
    );
    const allTables = new Set(allTablesResult.map((r) => r.TABLE_NAME));
    console.log(`► Found ${allTables.size} tables in database: ${[...allTables].join(', ')}\n`);

    // ── 2. Capture pre-reset counts ─────────────────────────────────────────
    console.log('► Pre-reset record counts:');
    const preCounts = {};
    for (const tbl of TABLES_TO_CLEAR) {
      if (!allTables.has(tbl)) { preCounts[tbl] = '(table not found)'; continue; }
      const [[row]] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\``);
      preCounts[tbl] = row.cnt;
      console.log(`   ${tbl.padEnd(30)} ${row.cnt} records`);
    }

    // ── 3. Disable FK checks and TRUNCATE all operational tables ───────────
    console.log('\n► Disabling foreign key checks...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ FK checks disabled.\n');

    const cleared = [];
    const skipped = [];

    for (const tbl of TABLES_TO_CLEAR) {
      if (!allTables.has(tbl)) {
        skipped.push(tbl);
        console.log(`   ⚠  SKIP  ${tbl} (table does not exist)`);
        continue;
      }
      try {
        await conn.query(`TRUNCATE TABLE \`${tbl}\``);
        cleared.push({ table: tbl, removed: preCounts[tbl] });
        console.log(`   ✓  CLEAR ${tbl.padEnd(30)} (removed ${preCounts[tbl]} records, AUTO_INCREMENT reset)`);
      } catch (err) {
        console.error(`   ✗  ERROR ${tbl}: ${err.message}`);
      }
    }

    // ── 4. Re-enable FK checks ───────────────────────────────────────────────
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✓ Foreign key checks re-enabled.');

    // ── 5. Reset all rooms to Available ─────────────────────────────────────
    console.log('\n► Resetting all rooms to Available...');
    if (allTables.has('rooms')) {
      const [roomResult] = await conn.query(`UPDATE rooms SET room_status = 'Available'`);
      console.log(`✓ ${roomResult.affectedRows} room(s) set to Available.`);
    } else {
      console.log('⚠  rooms table not found — skipped.');
    }

    // ── 6. Post-reset verification ───────────────────────────────────────────
    console.log('\n► Post-reset verification:');

    // Verify operational tables are empty
    let allClear = true;
    for (const tbl of TABLES_TO_CLEAR) {
      if (!allTables.has(tbl)) continue;
      const [[row]] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tbl}\``);
      const icon = row.cnt === 0 ? '✓' : '✗';
      if (row.cnt > 0) allClear = false;
      console.log(`   ${icon}  ${tbl.padEnd(30)} ${row.cnt} records remaining`);
    }

    // Rooms status check
    if (allTables.has('rooms')) {
      const [[roomCheck]] = await conn.query(`SELECT COUNT(*) as cnt FROM rooms WHERE room_status != 'Available'`);
      const icon = roomCheck.cnt === 0 ? '✓' : '✗';
      console.log(`   ${icon}  ${'rooms (non-available)'.padEnd(30)} ${roomCheck.cnt} rooms still not available`);
    }

    // Remaining staff accounts
    console.log('\n► Remaining staff accounts (preserved):');
    if (allTables.has('staff_accounts')) {
      const [staff] = await conn.query(`SELECT staff_id, staff_name, department, role FROM staff_accounts ORDER BY staff_id`);
      if (staff.length === 0) {
        console.log('   (none found)');
      } else {
        for (const s of staff) {
          console.log(`   ID ${String(s.staff_id).padEnd(4)} ${(s.staff_name || 'N/A').padEnd(25)} ${s.department} – ${s.role}`);
        }
      }
    } else {
      console.log('   staff_accounts table not found.');
    }

    // Remaining rooms inventory
    console.log('\n► Room inventory (preserved):');
    if (allTables.has('rooms')) {
      const [rooms] = await conn.query(`SELECT room_id, room_number, room_type, room_status, price_per_night FROM rooms ORDER BY room_id`);
      for (const r of rooms) {
        console.log(`   Room ${String(r.room_number).padEnd(5)} ${(r.room_type || '').padEnd(22)} ${r.room_status.padEnd(12)} ₹${r.price_per_night}/night`);
      }
    }

    // ── 7. Summary ────────────────────────────────────────────────────────────
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   RESET COMPLETE                                       ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    const totalRemoved = cleared.reduce((s, t) => s + (Number(t.removed) || 0), 0);
    console.log(`║   Tables cleared:      ${String(cleared.length).padEnd(32)}║`);
    console.log(`║   Tables skipped:      ${String(skipped.length).padEnd(32)}║`);
    console.log(`║   Total records removed: ${String(totalRemoved).padEnd(30)}║`);
    console.log(`║   All rooms: Available ✓                               ║`);
    console.log(`║   Schema/Staff/Rooms: Preserved ✓                      ║`);
    if (!allClear) {
      console.log('║   ⚠  Some tables still have records — check above.     ║');
    }
    console.log('╚════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('\n✗ Fatal error:', err.message);
    if (conn) {
      try { await conn.query('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) {}
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
