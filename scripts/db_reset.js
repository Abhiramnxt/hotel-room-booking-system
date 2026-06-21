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
  ssl: process.env.MYSQL_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined
};

async function resetDb() {
  console.log('Connecting to database:', dbConfig.database);
  const conn = await mysql.createConnection(dbConfig);

  try {
    // 1. Get all tables in database to check what tables actually exist
    const [tableRows] = await conn.query('SHOW TABLES');
    const dbTables = tableRows.map(r => Object.values(r)[0]);
    console.log('Found tables in database:', dbTables);

    // List of tables we want to clear:
    const tablesToClear = [
      'bookings',
      'guests',
      'guest_accounts',
      'active_stays',
      'stay_history',
      'payments',
      'housekeeping',
      'room_service_requests',
      'complaints',
      'feedback',
      'corporate_bookings',
      'room_availability',
      'communication_history',
      'front_desk_records',
      // Wildcard check for requested additional tables
      'notifications',
      'booking_audit_logs',
      'invoices',
      'visitor_registry'
    ];

    // Filter to tables that actually exist in the database:
    const existingTablesToClear = tablesToClear.filter(t => dbTables.includes(t));
    console.log('Tables target for clearing:', existingTablesToClear);

    // 2. Disable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('Disabled FOREIGN_KEY_CHECKS.');

    const summary = [];

    // 3. Clear data and reset auto increment
    for (const table of existingTablesToClear) {
      // Get record count before deletion
      const [[{ count }]] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
      
      // Truncate or Delete
      await conn.query(`DELETE FROM ${table}`);
      await conn.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      
      console.log(`Cleared table ${table} (${count} records removed, AUTO_INCREMENT reset)`);
      summary.push({ table, countRemoved: count });
    }

    // 4. Reset rooms status to Available
    if (dbTables.includes('rooms')) {
      const [roomResult] = await conn.query("UPDATE rooms SET room_status = 'Available'");
      console.log('Reset all rooms to Available status.', roomResult.info || roomResult.message || '');
    }

    // 5. Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Re-enabled FOREIGN_KEY_CHECKS.');

    // 6. Verify and output stats
    console.log('\n===================== VERIFICATION =====================');
    
    // Check remaining staff accounts
    let staffCount = 0;
    let staffList = [];
    if (dbTables.includes('staff_accounts')) {
      const [rows] = await conn.query('SELECT staff_id, staff_name, role, department, email FROM staff_accounts');
      staffCount = rows.length;
      staffList = rows;
      console.log(`Staff Accounts remaining: ${staffCount}`);
    }

    // Check remaining room inventory
    let roomsCount = 0;
    let availableRooms = 0;
    if (dbTables.includes('rooms')) {
      const [rows] = await conn.query('SELECT room_id, room_number, room_status FROM rooms');
      roomsCount = rows.length;
      availableRooms = rows.filter(r => r.room_status === 'Available').length;
      console.log(`Total Rooms: ${roomsCount} | Available: ${availableRooms}`);
    }

    // Check if any booking remains
    let remainingBookings = 0;
    if (dbTables.includes('bookings')) {
      const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM bookings');
      remainingBookings = count;
      console.log(`Remaining Bookings: ${remainingBookings}`);
    }

    // Check if any guest account remains
    let remainingGuests = 0;
    if (dbTables.includes('guest_accounts')) {
      const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM guest_accounts');
      remainingGuests = count;
      console.log(`Remaining Guest Accounts: ${remainingGuests}`);
    }

    // Check if any active stay remains
    let remainingActiveStays = 0;
    if (dbTables.includes('active_stays')) {
      const [[{ count }]] = await conn.query('SELECT COUNT(*) as count FROM active_stays');
      remainingActiveStays = count;
      console.log(`Remaining Active Stays: ${remainingActiveStays}`);
    }

    console.log('========================================================\n');

    console.log('Database reset completed successfully.');
    
    // Output JSON result for parent agent to digest
    console.log('RESET_JSON_START');
    console.log(JSON.stringify({
      success: true,
      summary,
      staffCount,
      staffList,
      roomsCount,
      availableRooms,
      remainingBookings,
      remainingGuests,
      remainingActiveStays
    }, null, 2));
    console.log('RESET_JSON_END');

  } catch (err) {
    console.error('Error during database reset:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

resetDb();
