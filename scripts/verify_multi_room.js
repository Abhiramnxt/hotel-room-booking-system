import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : 'http://localhost:3000';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'hotel_management'
};

async function verifyMultiRoom() {
  console.log('=== STARTING AUTOMATED MULTI-ROOM INTEGRATION AUDIT ===');
  const conn = await mysql.createConnection(dbConfig);
  
  try {
    // 1. Fetch available rooms
    console.log('\n[Step 1] Finding two available rooms...');
    const [rooms] = await conn.query('SELECT * FROM rooms WHERE room_status = "Available" LIMIT 2');
    if (rooms.length < 2) {
      throw new Error(`Insufficient available rooms (found ${rooms.length}). Please free rooms or run migration first.`);
    }
    const room1 = rooms[0];
    const room2 = rooms[1];
    console.log(`Selected for testing: Room ${room1.room_number} (ID: ${room1.room_id}) and Room ${room2.room_number} (ID: ${room2.room_id})`);

    // 2. Create guest account
    console.log('\n[Step 2] Creating Guest Account...');
    const guestEmail = `multi_room_test_${Date.now()}@gmail.com`;
    const guestName = "Multi Room Test Guest";
    const guestData = {
      full_name: guestName,
      mobile_number: "+919812488321",
      email: guestEmail,
      stay_duration: "4 Nights"
    };

    const createAccRes = await fetch(`${BASE_URL}/api/auth/guest-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestData)
    });
    if (!createAccRes.ok) {
      const errText = await createAccRes.text();
      throw new Error(`Create guest account failed: ${createAccRes.statusText} - Details: ${errText}`);
    }
    const createAccJson = await createAccRes.json();
    const guestAccount = createAccJson.account;
    console.log(`Guest Account Created: ID=${guestAccount.guest_id_str}, Username=${guestAccount.username}`);

    // 3. Create two bookings for this guest
    console.log('\n[Step 3] Creating Bookings for both rooms...');
    const bookingIds = [];
    
    for (const room of [room1, room2]) {
      const bookingData = {
        full_name: guestName,
        email: guestEmail,
        mobile_number: guestData.mobile_number,
        address: "456 Multi Room Blvd, New Delhi",
        government_id: "Aadhaar 1111-2222-3333",
        room_id: room.room_id,
        check_in_date: "2028-06-20",
        check_out_date: "2028-06-24",
        payment_method: "UPI"
      };

      const bookingRes = await fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      if (!bookingRes.ok) {
        const errText = await bookingRes.text();
        throw new Error(`Failed to create booking for room ${room.room_number}: ${errText}`);
      }
      const bookingJson = await bookingRes.json();
      bookingIds.push(bookingJson.booking.booking_id);
      console.log(`Booking created for Room ${room.room_number}. Booking ID: ${bookingJson.booking.booking_id}`);
    }

    // 4. Check-In both bookings
    console.log('\n[Step 4] Checking in both rooms...');
    for (const bookingId of bookingIds) {
      const checkinRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Checked-In" })
      });
      if (!checkinRes.ok) {
        throw new Error(`Failed to check in booking #${bookingId}`);
      }
      console.log(`Booking #${bookingId} is Checked-In.`);
    }

    // 5. Place dining orders for Room 1 and Room 2 independently
    console.log('\n[Step 5] Placing dining orders independently...');
    
    // Order for Room 1
    const order1Res = await fetch(`${BASE_URL}/api/room-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: guestEmail,
        request_type: "Dining Order: [Steaming Idli Sambar Plate (Qty: 2)]",
        room_id: room1.room_id,
        booking_id: bookingIds[0]
      })
    });
    if (!order1Res.ok) {
      throw new Error(`Failed to place order for Room ${room1.room_number}`);
    }
    const order1Json = await order1Res.json();
    const order1Id = order1Json.request.request_id;
    console.log(`Culinary order placed for Room ${room1.room_number}. Request ID: ${order1Id}`);

    // Order for Room 2
    const order2Res = await fetch(`${BASE_URL}/api/room-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: guestEmail,
        request_type: "Dining Order: [Crisp Masala Dosa (Qty: 1)]",
        room_id: room2.room_id,
        booking_id: bookingIds[1]
      })
    });
    if (!order2Res.ok) {
      throw new Error(`Failed to place order for Room ${room2.room_number}`);
    }
    const order2Json = await order2Res.json();
    const order2Id = order2Json.request.request_id;
    console.log(`Culinary order placed for Room ${room2.room_number}. Request ID: ${order2Id}`);

    // 6. Lodge complaints for Room 1 and Room 2 independently
    console.log('\n[Step 6] Lodging complaints independently...');
    
    // Complaint for Room 1
    const complaint1Res = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: guestEmail,
        complaint_category: "Air Conditioning Problem",
        complaint_description: "AC not cooling below 26 degrees",
        room_id: room1.room_id,
        booking_id: bookingIds[0]
      })
    });
    if (!complaint1Res.ok) {
      throw new Error(`Failed to lodge complaint for Room ${room1.room_number}`);
    }
    const complaint1Json = await complaint1Res.json();
    const complaint1Id = complaint1Json.complaint.complaint_id;
    console.log(`Complaint lodged for Room ${room1.room_number}. Complaint ID: ${complaint1Id}`);

    // Complaint for Room 2
    const complaint2Res = await fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: guestEmail,
        complaint_category: "Wi-Fi Internet Disconnections",
        complaint_description: "Wi-Fi signals are weak near the window",
        room_id: room2.room_id,
        booking_id: bookingIds[1]
      })
    });
    if (!complaint2Res.ok) {
      throw new Error(`Failed to lodge complaint for Room ${room2.room_number}`);
    }
    const complaint2Json = await complaint2Res.json();
    const complaint2Id = complaint2Json.complaint.complaint_id;
    console.log(`Complaint lodged for Room ${room2.room_number}. Complaint ID: ${complaint2Id}`);

    // 7. Directly verify records inside MySQL
    console.log('\n[Step 7] Verifying relational records inside the MySQL DB...');
    
    // Verify room service requests
    const [rsrRows] = await conn.query('SELECT * FROM room_service_requests WHERE request_id IN (?, ?)', [order1Id, order2Id]);
    console.log('Inspecting room_service_requests entries:');
    console.table(rsrRows);
    
    const dbOrder1 = rsrRows.find(r => r.request_id === order1Id);
    const dbOrder2 = rsrRows.find(r => r.request_id === order2Id);
    
    if (dbOrder1.booking_id !== bookingIds[0] || dbOrder1.room_id !== room1.room_id) {
      throw new Error(`Order 1 database mismatch! Expected booking_id=${bookingIds[0]}, room_id=${room1.room_id}. Got: booking_id=${dbOrder1.booking_id}, room_id=${dbOrder1.room_id}`);
    }
    if (dbOrder2.booking_id !== bookingIds[1] || dbOrder2.room_id !== room2.room_id) {
      throw new Error(`Order 2 database mismatch! Expected booking_id=${bookingIds[1]}, room_id=${room2.room_id}. Got: booking_id=${dbOrder2.booking_id}, room_id=${dbOrder2.room_id}`);
    }
    console.log('✅ Room service dining requests database fields validated successfully!');

    // Verify complaints
    const [complaintRows] = await conn.query('SELECT * FROM complaints WHERE complaint_id IN (?, ?)', [complaint1Id, complaint2Id]);
    console.log('Inspecting complaints entries:');
    console.table(complaintRows);
    
    const dbComp1 = complaintRows.find(c => c.complaint_id === complaint1Id);
    const dbComp2 = complaintRows.find(c => c.complaint_id === complaint2Id);
    
    if (dbComp1.booking_id !== bookingIds[0] || dbComp1.room_id !== room1.room_id) {
      throw new Error(`Complaint 1 database mismatch! Expected booking_id=${bookingIds[0]}, room_id=${room1.room_id}. Got: booking_id=${dbComp1.booking_id}, room_id=${dbComp1.room_id}`);
    }
    if (dbComp2.booking_id !== bookingIds[1] || dbComp2.room_id !== room2.room_id) {
      throw new Error(`Complaint 2 database mismatch! Expected booking_id=${bookingIds[1]}, room_id=${room2.room_id}. Got: booking_id=${dbComp2.booking_id}, room_id=${dbComp2.room_id}`);
    }
    console.log('✅ Issue desk complaints database fields validated successfully!');

    // 8. Clean up (Check-out stays to leave database in clean state)
    console.log('\n[Step 8] Checking out stays to clean up room availability...');
    for (const bookingId of bookingIds) {
      const checkoutRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Checked-Out" })
      });
      if (!checkoutRes.ok) {
        console.warn(`Clean-up Checkout failed for booking #${bookingId}`);
      } else {
        console.log(`Booking #${bookingId} checked out successfully.`);
      }
    }

    console.log('\n=== MULTI-ROOM INTEGRATION AUDIT PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('\n❌ MULTI-ROOM INTEGRATION AUDIT FAILED:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

verifyMultiRoom();
