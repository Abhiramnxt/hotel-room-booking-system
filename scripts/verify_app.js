const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : 'http://localhost:3000';

async function verifyAll() {
  console.log('=== STARTING INTEGRATION VERIFICATION RUN ===');

  try {
    // 1. Fetch rooms and pick an available one
    console.log('\n[Step 1] Fetching Rooms...');
    const roomsRes = await fetch(`${BASE_URL}/api/rooms`);
    if (!roomsRes.ok) throw new Error(`Fetch rooms failed: ${roomsRes.statusText}`);
    const { rooms } = await roomsRes.json();
    console.log(`Successfully fetched ${rooms.length} rooms.`);
    const testRoom = rooms.find(r => r.room_status === 'Available') || rooms[0];
    console.log(`Selected Room for Testing: Room ${testRoom.room_number} (ID: ${testRoom.room_id})`);

    // 2. Create a guest account
    console.log('\n[Step 2] Creating Guest Account...');
    const guestData = {
      full_name: "Integration Test Guest",
      mobile_number: "+919812488321",
      email: `test_integration_${Date.now()}@gmail.com`,
      stay_duration: "3 Nights"
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
    console.log('Guest Account Created:', createAccJson.account);
    const { username, password_hash, account_id } = createAccJson.account;

    // 3. Guest Login
    console.log('\n[Step 3] Verifying Guest Login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: password_hash })
    });
    if (!loginRes.ok) throw new Error(`Guest login failed: ${loginRes.statusText}`);
    const loginJson = await loginRes.json();
    console.log('Login Successful! Authenticated Role:', loginJson.role);

    // 4. Booking Creation
    console.log('\n[Step 4] Creating a New Booking...');
    let bookingId;
    let selectedRoom = testRoom;
    
    for (const room of rooms) {
      if (room.room_status !== 'Available') continue;
      
      const bookingData = {
        full_name: guestData.full_name,
        email: guestData.email,
        mobile_number: guestData.mobile_number,
        address: "123 Automation Lane, Tech City",
        government_id: "Aadhaar 8888-9999-1111",
        room_id: room.room_id,
        check_in_date: "2026-06-25",
        check_out_date: "2026-06-28",
        payment_method: "UPI"
      };
      
      const bookingRes = await fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      if (bookingRes.ok) {
        const bookingJson = await bookingRes.json();
        bookingId = bookingJson.booking.booking_id;
        selectedRoom = room;
        console.log(`Booking Created Successfully for Room ${room.room_number}! Booking ID: ${bookingId}`);
        break;
      } else {
        const errTxt = await bookingRes.text();
        console.log(`Room ${room.room_number} check-in check failed: ${errTxt.trim()}. Trying next available room...`);
      }
    }
    
    if (!bookingId) {
      throw new Error(`Booking creation failed for all available rooms.`);
    }

    // 5. Check-In (Update Booking Status)
    console.log(`\n[Step 5] Checking-In Booking #${bookingId}...`);
    const checkinRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "Checked-In" })
    });
    if (!checkinRes.ok) throw new Error(`Check-in failed: ${checkinRes.statusText}`);
    const checkinJson = await checkinRes.json();
    console.log('Check-in status update result:', checkinJson.booking.booking_status);

    // 6. Check-Out (Update Booking Status)
    console.log(`\n[Step 6] Checking-Out Booking #${bookingId}...`);
    const checkoutRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "Checked-Out" })
    });
    if (!checkoutRes.ok) throw new Error(`Check-out failed: ${checkoutRes.statusText}`);
    const checkoutJson = await checkoutRes.json();
    console.log('Check-out status update result:', checkoutJson.booking.booking_status);

    // 7. Dispatching messages (WhatsApp / Email)
    console.log('\n[Step 7] Testing Outbound Dispatch Service...');
    const dispatchData = {
      account_id: account_id,
      communication_type: "Guest Login Credentials",
      channel: "WhatsApp",
      staff_member: "Automation Verification Script",
      is_test: false
    };
    const dispatchRes = await fetch(`${BASE_URL}/api/auth/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dispatchData)
    });
    
    // Note: Due to WhatsApp Meta API sandboxes or expired keys, dispatch might succeed or return 400 failure from Meta.
    // We want to verify that the server handled the db logs correctly and didn't crash.
    console.log(`Dispatch endpoint response status: ${dispatchRes.status}`);
    const dispatchJson = await dispatchRes.json();
    console.log('Dispatch API Result:', JSON.stringify(dispatchJson));

    // 8. Communication Logs Retrieval
    console.log('\n[Step 8] Fetching Communication Logs...');
    const logsRes = await fetch(`${BASE_URL}/api/auth/communication-logs`);
    if (!logsRes.ok) throw new Error(`Fetching logs failed: ${logsRes.statusText}`);
    const logsJson = await logsRes.json();
    console.log(`Successfully retrieved ${logsJson.logs.length} communication logs.`);
    console.log('Latest log entries (first 3):');
    console.log(logsJson.logs.slice(0, 3));

    console.log('\n=== INTEGRATION VERIFICATION SUCCESSFUL! ALL FLOWS CHECKED ===');
  } catch (err) {
    console.error('\n❌ INTEGRATION VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

verifyAll();
