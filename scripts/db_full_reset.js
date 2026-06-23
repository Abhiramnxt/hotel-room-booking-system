/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SAI NIRVANA PLAZA — FULL DATABASE RESET (Day 1 Demo State)      ║
 * ║  Clears all operational data. Preserves schema, staff & rooms.   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * SAFE TO RUN: Does NOT drop tables, alter structure, or remove:
 *   ✓ staff_accounts
 *   ✓ rooms (master data)
 *   ✓ room_categories (if exists)
 *   ✓ hotel_config / system_config (if exists)
 *
 * CLEARS:
 *   ✗ bookings, guests, guest_accounts
 *   ✗ active_stays, stay_history
 *   ✗ payments, invoices
 *   ✗ housekeeping, room_service_requests
 *   ✗ complaints, feedback
 *   ✗ corporate_bookings
 *   ✗ communication_history, notifications
 *   ✗ booking_audit_logs, front_desk_records
 *   ✗ visitor_registry
 *   ✗ room_availability (will be rebuilt fresh)
 *   ✗ Any analytics cache tables
 *
 * Also resets:
 *   ✓ Room status → "Available" for all rooms
 *   ✓ AUTO_INCREMENT counters → 1
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'hotel_management',
  ssl: process.env.MYSQL_SSL === 'true' || process.env.MYSQL_HOST?.includes('railway')
    ? { rejectUnauthorized: false }
    : undefined,
  connectTimeout: 15000
};

// ── Tables to CLEAR (operational data) ─────────────────────────────────────────
const APPLICATION_DATA_TABLES = [
  // Core booking tables (order matters for FK references)
  'booking_audit_logs',
  'front_desk_records',
  'visitor_registry',
  'notifications',
  'invoices',

  // Communication
  'communication_history',

  // Guest services
  'room_service_requests',
  'complaints',
  'feedback',
  'housekeeping',

  // Stays
  'stay_history',
  'active_stays',

  // Payments
  'payments',

  // Corporate bookings
  'corporate_bookings',

  // Room availability calendar
  'room_availability',

  // Core guest & booking tables (last — referenced by above)
  'bookings',
  'guest_accounts',
  'guests',
];

// ── Tables to PRESERVE (master data / staff / config) ──────────────────────────
const PRESERVE_TABLES = [
  'staff_accounts',
  'rooms',
  'room_categories',
  'hotel_config',
  'system_config',
  'app_settings',
  'hotel_settings',
];

// ── Helper ─────────────────────────────────────────────────────────────────────
function pad(str, len = 38) {
  return String(str).padEnd(len);
}

function banner(msg) {
  const line = '─'.repeat(64);
  console.log(`\n${line}`);
  console.log(`  ${msg}`);
  console.log(line);
}

async function fullReset() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  SAI NIRVANA PLAZA — FULL DATABASE RESET                          ║');
  console.log('║  Target: Day 1 Demo Environment (Clean Operational Data)          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`  Host     : ${dbConfig.host}`);
  console.log(`  Database : ${dbConfig.database}`);
  console.log(`  User     : ${dbConfig.user}`);
  console.log(`  SSL      : ${dbConfig.ssl ? 'enabled' : 'disabled'}\n`);

  const conn = await mysql.createConnection(dbConfig);
  console.log('  ✓ Connected to database.\n');

  const resetSummary = [];

  try {
    // ── STEP 1: Discover actual tables in the database ────────────────────────
    banner('STEP 1 — DISCOVERING TABLES');
    const [tableRows] = await conn.query('SHOW TABLES');
    const allTables = tableRows.map(r => Object.values(r)[0]);
    console.log(`  Found ${allTables.length} table(s) in database: ${allTables.join(', ')}\n`);

    // Determine which tables to actually clear vs preserve
    const tablesToClear   = APPLICATION_DATA_TABLES.filter(t => allTables.includes(t));
    const tablesToPreserve = PRESERVE_TABLES.filter(t => allTables.includes(t));

    // Any unrecognised tables (neither in clear list nor preserve list)
    const knownTables = new Set([...APPLICATION_DATA_TABLES, ...PRESERVE_TABLES]);
    const unknownTables = allTables.filter(t => !knownTables.has(t));

    console.log(`  ✓ Tables targeted for clearing    : ${tablesToClear.length}`);
    console.log(`  ✓ Tables preserved (master data)  : ${tablesToPreserve.length}`);
    if (unknownTables.length > 0) {
      console.log(`  ⚠ Unrecognised tables (skipped)   : ${unknownTables.join(', ')}`);
    }

    // ── STEP 2: Pre-reset record counts ──────────────────────────────────────
    banner('STEP 2 — PRE-RESET RECORD COUNTS');
    const preCounts = {};
    for (const table of tablesToClear) {
      const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
      preCounts[table] = Number(cnt);
      console.log(`  ${pad(table)} ${String(preCounts[table]).padStart(6)} record(s)`);
    }
    const totalRecordsBefore = Object.values(preCounts).reduce((a, b) => a + b, 0);
    console.log(`\n  ► Total records to remove: ${totalRecordsBefore}`);

    // ── STEP 3: Disable FK checks ─────────────────────────────────────────────
    banner('STEP 3 — DISABLING FOREIGN KEY CHECKS');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('  ✓ FOREIGN_KEY_CHECKS = 0');

    // ── STEP 4: Clear operational tables ─────────────────────────────────────
    banner('STEP 4 — CLEARING OPERATIONAL DATA');
    for (const table of tablesToClear) {
      const count = preCounts[table];
      await conn.query(`DELETE FROM \`${table}\``);
      await conn.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      console.log(`  ✓ ${pad(table)} cleared (${count} records removed, AUTO_INCREMENT → 1)`);
      resetSummary.push({ table, recordsRemoved: count });
    }

    // ── STEP 5: Reset room status ─────────────────────────────────────────────
    banner('STEP 5 — RESETTING ROOM STATUS');
    if (allTables.includes('rooms')) {
      const [[{ dirty }]] = await conn.query(
        "SELECT COUNT(*) AS dirty FROM rooms WHERE room_status != 'Available'"
      );
      const [result] = await conn.query("UPDATE rooms SET room_status = 'Available'");
      console.log(`  ✓ Reset ${dirty} room(s) to 'Available' status.`);
      console.log(`    (${result.affectedRows} row(s) affected)`);
    } else {
      console.log('  ⚠ rooms table not found — skipping room status reset.');
    }

    // ── STEP 6: Re-enable FK checks ───────────────────────────────────────────
    banner('STEP 6 — RE-ENABLING FOREIGN KEY CHECKS');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('  ✓ FOREIGN_KEY_CHECKS = 1');

    // ── STEP 7: VERIFICATION ──────────────────────────────────────────────────
    banner('STEP 7 — POST-RESET VERIFICATION');

    // 7a. Verify cleared tables are empty
    let allClear = true;
    console.log('\n  [Cleared Tables Verification]');
    for (const table of tablesToClear) {
      const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
      const count = Number(cnt);
      const status = count === 0 ? '✓' : '✗ STILL HAS DATA!';
      if (count > 0) allClear = false;
      console.log(`    ${status}  ${pad(table)} ${count} record(s) remaining`);
    }

    // 7b. Staff accounts preserved
    console.log('\n  [Preserved: Staff Accounts]');
    let staffList = [];
    if (allTables.includes('staff_accounts')) {
      const [rows] = await conn.query(
        'SELECT staff_id, staff_name, role, department, email FROM staff_accounts ORDER BY role'
      );
      staffList = rows;
      if (rows.length === 0) {
        console.log('    ⚠ WARNING: No staff accounts found!');
      }
      rows.forEach(s =>
        console.log(`    ✓  [${String(s.staff_id).padStart(3)}] ${pad(s.staff_name, 25)} | ${pad(s.role, 20)} | ${s.email}`)
      );
    } else {
      console.log('    ⚠ staff_accounts table not found.');
    }

    // 7c. Room inventory
    console.log('\n  [Preserved: Room Inventory]');
    let roomStats = { total: 0, available: 0, byType: [] };
    if (allTables.includes('rooms')) {
      const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM rooms');
      const [[{ available }]] = await conn.query("SELECT COUNT(*) AS available FROM rooms WHERE room_status = 'Available'");
      const [byType] = await conn.query(
        'SELECT room_type, COUNT(*) AS cnt, MIN(price_per_night) AS min_price, MAX(price_per_night) AS max_price FROM rooms GROUP BY room_type ORDER BY room_type'
      );
      roomStats = { total: Number(total), available: Number(available), byType };
      console.log(`    Total rooms     : ${roomStats.total}`);
      console.log(`    Available       : ${roomStats.available}`);
      console.log(`    Occupied        : ${roomStats.total - roomStats.available}`);
      byType.forEach(rt =>
        console.log(`    ├─ ${pad(rt.room_type, 22)} ${String(rt.cnt).padStart(3)} room(s)  ₹${rt.min_price}–₹${rt.max_price}/night`)
      );
    } else {
      console.log('    ⚠ rooms table not found.');
    }

    // 7d. Final checklist
    const bookingCount = tablesToClear.includes('bookings')
      ? Number((await conn.query("SELECT COUNT(*) AS cnt FROM bookings"))[0][0].cnt) : '?';
    const guestAccountCount = tablesToClear.includes('guest_accounts')
      ? Number((await conn.query("SELECT COUNT(*) AS cnt FROM guest_accounts"))[0][0].cnt) : '?';
    const activeStayCount = tablesToClear.includes('active_stays')
      ? Number((await conn.query("SELECT COUNT(*) AS cnt FROM active_stays"))[0][0].cnt) : '?';

    console.log('\n  [Final Checklist]');
    console.log(`    ${guestAccountCount === 0 ? '✓' : '✗'}  No guest accounts remain        : ${guestAccountCount}`);
    console.log(`    ${bookingCount === 0 ? '✓' : '✗'}  No bookings remain              : ${bookingCount}`);
    console.log(`    ${activeStayCount === 0 ? '✓' : '✗'}  No active stays remain          : ${activeStayCount}`);
    console.log(`    ${roomStats.available === roomStats.total && roomStats.total > 0 ? '✓' : '✗'}  All rooms available             : ${roomStats.available}/${roomStats.total}`);
    console.log(`    ${staffList.length > 0 ? '✓' : '✗'}  Staff logins preserved          : ${staffList.length} account(s)`);

    // ── STEP 8: SUMMARY OUTPUT ────────────────────────────────────────────────
    banner('RESET COMPLETE — SUMMARY');
    console.log(`\n  Total tables cleared     : ${tablesToClear.length}`);
    console.log(`  Total records removed    : ${totalRecordsBefore}`);
    console.log(`  AUTO_INCREMENT reset on  : ${tablesToClear.length} table(s)`);
    console.log(`  Rooms now available      : ${roomStats.available}/${roomStats.total}`);
    console.log(`  Staff accounts remaining : ${staffList.length}`);
    console.log(`\n  System state: ✅ CLEAN "DAY 1 DEMO ENVIRONMENT"\n`);

    if (!allClear) {
      console.log('  ⚠ WARNING: Some tables may still have data — see verification above.\n');
    }

    // Machine-readable JSON output for scripting
    console.log('RESET_JSON_START');
    console.log(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      totalTablesCleared: tablesToClear.length,
      totalRecordsRemoved: totalRecordsBefore,
      tablesCleared: resetSummary,
      staffAccountsRemaining: staffList.length,
      staffList,
      roomInventory: {
        total: roomStats.total,
        available: roomStats.available,
        byType: roomStats.byType
      },
      verification: {
        noGuestAccounts: guestAccountCount === 0,
        noBookings: bookingCount === 0,
        noActiveStays: activeStayCount === 0,
        allRoomsAvailable: roomStats.available === roomStats.total,
        staffPreserved: staffList.length > 0
      }
    }, null, 2));
    console.log('RESET_JSON_END');

  } catch (err) {
    console.error('\n  ✗ ERROR during database reset:', err.message || err);
    console.error(err.stack || '');
    // Re-enable FK checks even on failure
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('  ✓ Re-enabled FOREIGN_KEY_CHECKS after error.');
    } catch (e2) { /* ignore */ }
    process.exit(1);
  } finally {
    await conn.end();
    console.log('  Database connection closed.\n');
  }
}

fullReset();
