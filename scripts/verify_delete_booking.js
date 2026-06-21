const BASE_URL = process.env.TEST_PORT ? `http://localhost:${process.env.TEST_PORT}` : 'http://localhost:3000';

async function verifyDelete() {
  console.log('=== STARTING BOOKING DELETE SAFETY VERIFICATION ===');

  try {
    // 1. Fetch rooms
    console.log('\n[Step 1] Fetching Rooms...');
    const roomsRes = await fetch(`${BASE_URL}/api/rooms`);
    if (!roomsRes.ok) throw new Error(`Fetch rooms failed: ${roomsRes.statusText}`);
    const { rooms } = await roomsRes.json();
    console.log(`Successfully fetched ${rooms.length} rooms.`);

    // 2. Booking Creation (try different rooms until one succeeds)
    console.log('\n[Step 2] Creating a New Booking...');
    let bookingId;
    let selectedRoom;

    for (const room of rooms) {
      if (room.room_status !== 'Available') continue;

      const bookingData = {
        full_name: "Safety Delete Test Guest",
        email: "delete_test@gmail.com",
        mobile_number: "+919999999999",
        address: "456 Safety Lane, Tech City",
        government_id: "Aadhaar 1111-2222-3333",
        room_id: room.room_id,
        check_in_date: "2026-06-25",
        check_out_date: "2026-06-28",
        payment_method: "Cash"
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

    // 3. Try to DELETE the booking while it is 'Pending'
    console.log(`\n[Step 3] Attempting to delete Pending booking #${bookingId} (Should Fail)...`);
    const deletePendingRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    
    console.log(`DELETE response status: ${deletePendingRes.status}`);
    const deletePendingJson = await deletePendingRes.json();
    console.log('DELETE response payload:', JSON.stringify(deletePendingJson));
    
    if (deletePendingRes.status !== 400 || deletePendingJson.success !== false) {
      throw new Error(`Expected deletion to fail with HTTP 400 and success: false, but got status ${deletePendingRes.status} and payload ${JSON.stringify(deletePendingJson)}`);
    }
    console.log('✅ Safely prevented deletion of a Pending booking.');

    // 4. Update status to Checked-In
    console.log(`\n[Step 4] Checking-In Booking #${bookingId}...`);
    const checkinRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "Checked-In" })
    });
    if (!checkinRes.ok) throw new Error(`Check-in failed: ${checkinRes.statusText}`);
    console.log('Check-in status update successful!');

    // 5. Try to DELETE the booking while it is 'Checked-In'
    console.log(`\n[Step 5] Attempting to delete Checked-In booking #${bookingId} (Should Fail)...`);
    const deleteCheckedInRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    
    console.log(`DELETE response status: ${deleteCheckedInRes.status}`);
    const deleteCheckedInJson = await deleteCheckedInRes.json();
    console.log('DELETE response payload:', JSON.stringify(deleteCheckedInJson));
    
    if (deleteCheckedInRes.status !== 400 || deleteCheckedInJson.success !== false) {
      throw new Error(`Expected deletion to fail with HTTP 400 and success: false, but got status ${deleteCheckedInRes.status} and payload ${JSON.stringify(deleteCheckedInJson)}`);
    }
    console.log('✅ Safely prevented deletion of a Checked-In booking.');

    // 6. Update status to Checked-Out
    console.log(`\n[Step 6] Checking-Out Booking #${bookingId}...`);
    const checkoutRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: "Checked-Out" })
    });
    if (!checkoutRes.ok) throw new Error(`Check-out failed: ${checkoutRes.statusText}`);
    console.log('Check-out status update successful!');

    // 7. Try to DELETE the booking while it is 'Checked-Out'
    console.log(`\n[Step 7] Attempting to delete Checked-Out (Archived) booking #${bookingId} (Should Succeed)...`);
    const deleteCheckedOutRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
      method: 'DELETE'
    });
    
    console.log(`DELETE response status: ${deleteCheckedOutRes.status}`);
    const deleteCheckedOutJson = await deleteCheckedOutRes.json();
    console.log('DELETE response payload:', JSON.stringify(deleteCheckedOutJson));
    
    if (deleteCheckedOutRes.status !== 200 || deleteCheckedOutJson.success !== true) {
      throw new Error(`Expected deletion to succeed with HTTP 200 and success: true, but got status ${deleteCheckedOutRes.status} and payload ${JSON.stringify(deleteCheckedOutJson)}`);
    }
    console.log('✅ Successfully deleted Checked-Out booking.');

    // 8. Verify the booking no longer exists in the list
    console.log(`\n[Step 8] Verifying booking #${bookingId} is absent from bookings list...`);
    const finalBookingsRes = await fetch(`${BASE_URL}/api/bookings`);
    if (!finalBookingsRes.ok) throw new Error(`Fetch bookings failed: ${finalBookingsRes.statusText}`);
    const { bookings: finalBookings } = await finalBookingsRes.json();
    const foundBooking = finalBookings.find(b => b.booking_id === bookingId);
    
    if (foundBooking) {
      throw new Error(`Deleted booking #${bookingId} was still found in the bookings list!`);
    }
    console.log('✅ Verified booking is completely removed from list.');

    console.log('\n=== BOOKING DELETE SAFETY VERIFICATION SUCCESSFUL! ALL TESTS PASSED ===');
  } catch (err) {
    console.error('\n❌ BOOKING DELETE SAFETY VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

verifyDelete();
