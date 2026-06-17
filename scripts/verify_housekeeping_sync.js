import 'dotenv/config';
import { dbOps } from '../src/server_db.js';
import { query, execute } from '../src/mysql_client.js';

async function testHousekeepingSync() {
  console.log('=== STARTING HOUSEKEEPING SYNCHRONIZATION TEST ===');
  
  try {
    // 1. Find an available room
    const rooms = await dbOps.getRooms();
    const testRoom = rooms.find(r => r.room_status === 'Available');
    if (!testRoom) throw new Error('No available room found to start test.');
    console.log(`\nSelected room for test: Room ${testRoom.room_number} (ID: ${testRoom.room_id})`);

    // 2. Create guest
    const guestRes = await execute(
      'INSERT INTO guests (full_name, email, mobile_number, address, government_id) VALUES (?, ?, ?, ?, ?)',
      ['Test Housekeeping Sync Guest', 'hk_sync@test.com', '+919999999999', '123 Test Rd', 'ID-8888']
    );
    const guestId = guestRes.insertId;

    // 3. Create booking (e.g. today to 3 days later)
    const today = new Date();
    const checkout = new Date();
    checkout.setDate(today.getDate() + 3);
    const checkInStr = today.toISOString().split('T')[0];
    const checkOutStr = checkout.toISOString().split('T')[0];

    console.log(`Creating test booking: ${checkInStr} to ${checkOutStr}...`);
    const bookingRes = await execute(
      'INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, booking_status) VALUES (?, ?, ?, ?, ?)',
      [guestId, testRoom.room_id, checkInStr, checkOutStr, 'Pending']
    );
    const bookingId = bookingRes.insertId;

    // Set room_availability dates to Booked
    let curr = new Date(today);
    while (curr < checkout) {
      const dStr = curr.toISOString().split('T')[0];
      await execute(
        'INSERT INTO room_availability (room_id, available_date, availability_status) VALUES (?, ?, "Booked") ON DUPLICATE KEY UPDATE availability_status = "Booked"',
        [testRoom.room_id, dStr]
      );
      curr.setDate(curr.getDate() + 1);
    }

    // Check availability status
    let checkAvail = await query('SELECT * FROM room_availability WHERE room_id = ? AND availability_status = "Booked"', [testRoom.room_id]);
    console.log(`Availability dates blocked in DB: ${checkAvail.map(a => a.available_date.toISOString().split('T')[0]).join(', ')}`);

    // 4. Check-in guest
    console.log('\nChecking-in guest...');
    await dbOps.updateBookingStatus(bookingId, 'Checked-In');
    
    // Verify room status is Occupied and active stay exists
    let [roomCheck] = await query('SELECT room_status FROM rooms WHERE room_id = ?', [testRoom.room_id]);
    console.log(`Room status: ${roomCheck.room_status}`);
    let activeStays = await query('SELECT * FROM active_stays WHERE room_id = ?', [testRoom.room_id]);
    console.log(`Active stays record exists: ${activeStays.length > 0}`);

    // 5. Check-out guest (early checkout simulation)
    console.log('\nChecking-out guest (Early Checkout)...');
    await dbOps.updateBookingStatus(bookingId, 'Checked-Out');

    // Verify room is Dirty, active stays is deleted, and housekeeping task is created
    [roomCheck] = await query('SELECT room_status FROM rooms WHERE room_id = ?', [testRoom.room_id]);
    console.log(`Room status: ${roomCheck.room_status}`);
    activeStays = await query('SELECT * FROM active_stays WHERE room_id = ?', [testRoom.room_id]);
    console.log(`Active stays record exists: ${activeStays.length > 0}`);

    const hkTasks = await query('SELECT * FROM housekeeping WHERE room_id = ? AND task_status = "Pending"', [testRoom.room_id]);
    console.log(`Pending Housekeeping task exists: ${hkTasks.length > 0}`);
    if (hkTasks.length === 0) throw new Error('No housekeeping task found.');
    const taskId = hkTasks[0].task_id;

    // 6. Housekeeping completes task
    console.log(`\nCompleting Housekeeping task #${taskId}...`);
    await dbOps.updateHousekeepingTask(taskId, 'Completed');

    // 7. Verify all state updates
    console.log('\n--- VERIFYING MY-SQL DATABASE STATE SYNCHRONIZATION ---');
    [roomCheck] = await query('SELECT room_status FROM rooms WHERE room_id = ?', [testRoom.room_id]);
    console.log(`- Room Status (Expected Available): ${roomCheck.room_status}`);
    
    const activeStaysClean = await query('SELECT * FROM active_stays WHERE room_id = ?', [testRoom.room_id]);
    console.log(`- Stale Active Stays Deleted (Expected 0): ${activeStaysClean.length}`);

    const hkTasksClean = await query('SELECT * FROM housekeeping WHERE task_id = ?', [taskId]);
    console.log(`- Housekeeping Task status (Expected Completed): ${hkTasksClean[0].task_status}`);

    const testDates = [];
    let currCheck = new Date(today);
    while (currCheck < checkout) {
      testDates.push(currCheck.toISOString().split('T')[0]);
      currCheck.setDate(currCheck.getDate() + 1);
    }

    const availabilityClean = await query(
      'SELECT * FROM room_availability WHERE room_id = ? AND available_date IN (?) AND availability_status = "Booked"',
      [testRoom.room_id, testDates]
    );
    console.log(`- Booked availability entries left (Expected 0): ${availabilityClean.length}`);

    if (roomCheck.room_status === 'Available' && activeStaysClean.length === 0 && availabilityClean.length === 0) {
      console.log('\n✅ HOUSEKEEPING COMPLETION SYNCHRONIZATION TEST PASSED!');
    } else {
      console.error('\n❌ DATABASE DESYNCHRONIZATION DETECTED!');
      process.exit(1);
    }

    // Cleanup test data
    await execute('DELETE FROM stay_history WHERE booking_id = ?', [bookingId]);
    await execute('DELETE FROM payments WHERE booking_id = ?', [bookingId]);
    await execute('DELETE FROM bookings WHERE booking_id = ?', [bookingId]);
    await execute('DELETE FROM guests WHERE guest_id = ?', [guestId]);
    await execute('DELETE FROM housekeeping WHERE room_id = ?', [testRoom.room_id]);
    
  } catch (err) {
    console.error('\n❌ TEST RUN ERROR:', err);
    process.exit(1);
  }
}

testHousekeepingSync();
