/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Guest, Room, Booking, Payment, HousekeepingTask, 
  RoomServiceRequest, Complaint, Feedback, CorporateBooking, 
  Staff, SqlQueryLog, GuestAccount, CommunicationLog, RoomAvailability
} from './types.js';
import { initMysqlPool, query, execute, getPool } from './mysql_client.js';

// SQL query logs in memory for the Consistency Check Dashboard
let queryLogs: SqlQueryLog[] = [];

export async function executeQueryAsync<T>(rawSql: string, tablesInvolved: string[], action: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await action();
    const duration = Date.now() - start;
    
    queryLogs.unshift({
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      timestamp: new Date().toISOString(),
      query: rawSql,
      tables_involved: tablesInvolved,
      execution_time_ms: Math.max(1, duration),
      status: 'SUCCESS'
    });
    
    if (queryLogs.length > 150) queryLogs.pop();
    
    return result;
  } catch (err: any) {
    const duration = Date.now() - start;
    queryLogs.unshift({
      id: Math.random().toString(36).substring(2, 11).toUpperCase(),
      timestamp: new Date().toISOString(),
      query: rawSql,
      tables_involved: tablesInvolved,
      execution_time_ms: duration,
      status: 'ERROR'
    });
    throw err;
  }
}

// Deprecated sync fallback for executeQuery
export function executeQuery<T>(rawSql: string, tablesInvolved: string[], action: () => T): T {
  return action();
}

export function formatDate(d: any): string {
  if (!d) return '';
  if (d instanceof Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (d.includes(' ')) return d.split(' ')[0];
    return d;
  }
  return String(d);
}

// Bootstrap DB
export async function initDB() {
  try {
    initMysqlPool();
    console.log('[Database] MySQL pool initialized successfully.');
  } catch (err) {
    console.error('[Database] Failed to initialize MySQL pool:', err);
  }
}

export const dbOps = {
  getRooms: () => {
    const sql = `SELECT * FROM rooms;`;
    return executeQueryAsync(sql, ['rooms'], async () => {
      const rows = await query(sql);
      return rows.map((r: any) => ({
        ...r,
        amenities: typeof r.amenities === 'string' ? JSON.parse(r.amenities) : r.amenities,
        gallery_images: typeof r.gallery_images === 'string' ? JSON.parse(r.gallery_images) : r.gallery_images,
        reviews: typeof r.reviews === 'string' ? JSON.parse(r.reviews) : r.reviews
      }));
    });
  },

  getRoomAvailability: () => {
    const sql = `SELECT * FROM room_availability WHERE available_date BETWEEN '2026-06-01' AND '2026-06-30'`;
    return executeQueryAsync(sql, ['room_availability'], async () => {
      return await query(sql);
    });
  },

  getGuests: () => {
    const sql = `SELECT * FROM guests ORDER BY created_at DESC;`;
    return executeQueryAsync(sql, ['guests'], async () => {
      return await query(sql);
    });
  },

  getStaff: () => {
    const sql = `SELECT * FROM staff_accounts;`;
    return executeQueryAsync(sql, ['staff_accounts'], async () => {
      return await query(sql);
    });
  },

  getSqlLogs: () => {
    return queryLogs;
  },

  clearSqlLogs: () => {
    queryLogs = [];
  },

  getBookings: () => {
    const sql = `
      SELECT b.*, g.full_name AS guest_name, g.email AS guest_email, g.mobile_number AS guest_phone,
             r.room_number, r.room_type, r.price_per_night
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.guest_id
      LEFT JOIN rooms r ON b.room_id = r.room_id
      ORDER BY b.created_at DESC;
    `;
    return executeQueryAsync(sql, ['bookings', 'guests', 'rooms'], async () => {
      const rows = await query(sql);
      return rows.map((r: any) => ({
        ...r,
        check_in_date: formatDate(r.check_in_date),
        check_out_date: formatDate(r.check_out_date),
        is_archived: !!r.is_archived
      }));
    });
  },

  getActiveStays: () => {
    const sql = `
      SELECT a.*, g.full_name AS guest_name, g.email AS guest_email, g.mobile_number AS guest_phone,
             r.room_number, r.room_type, r.price_per_night
      FROM active_stays a
      LEFT JOIN guests g ON a.guest_id = g.guest_id
      LEFT JOIN rooms r ON a.room_id = r.room_id
      ORDER BY a.check_in_at DESC;
    `;
    return executeQueryAsync(sql, ['active_stays', 'guests', 'rooms'], async () => {
      const rows = await query(sql);
      return rows.map((r: any) => ({
        ...r,
        expected_check_out: formatDate(r.expected_check_out)
      }));
    });
  },

  getHousekeeping: () => {
    const sql = `
      SELECT h.*, r.room_number, r.room_type
      FROM housekeeping h
      LEFT JOIN rooms r ON h.room_id = r.room_id;
    `;
    return executeQueryAsync(sql, ['housekeeping', 'rooms'], async () => {
      return await query(sql);
    });
  },

  getComplaints: () => {
    const sql = `
      SELECT c.*, g.full_name AS guest_name, r.room_number
      FROM complaints c
      LEFT JOIN guests g ON c.guest_id = g.guest_id
      LEFT JOIN rooms r ON COALESCE(c.room_id, (
        SELECT room_id FROM bookings WHERE guest_id = c.guest_id AND booking_status = 'Checked-In' LIMIT 1
      )) = r.room_id;
    `;
    return executeQueryAsync(sql, ['complaints', 'guests', 'rooms', 'bookings'], async () => {
      return await query(sql);
    });
  },

  getFeedback: () => {
    const sql = `
      SELECT f.*, g.full_name AS guest_name, g.email AS guest_email
      FROM feedback f
      LEFT JOIN guests g ON f.guest_id = g.guest_id;
    `;
    return executeQueryAsync(sql, ['feedback', 'guests'], async () => {
      return await query(sql);
    });
  },

  getCorporate: () => {
    const sql = `SELECT * FROM corporate_bookings;`;
    return executeQueryAsync(sql, ['corporate_bookings'], async () => {
      return await query(sql);
    });
  },

  getPayments: () => {
    const sql = `SELECT * FROM payments;`;
    return executeQueryAsync(sql, ['payments'], async () => {
      return await query(sql);
    });
  },

  createBookingTransaction: (bookingData: {
    full_name: string;
    email: string;
    mobile_number: string;
    address: string;
    government_id: string;
    room_id: number;
    check_in_date: string;
    check_out_date: string;
    payment_method: "UPI" | "Credit Card" | "Debit Card" | "Net Banking" | "Cash";
  }) => {
    const sql = `START TRANSACTION; /* createBookingTransaction */`;
    return executeQueryAsync(sql, ['bookings', 'guests', 'rooms', 'payments', 'room_availability'], async () => {
      await query('START TRANSACTION');
      try {
        let guestId: number;
        const existingGuests = await query('SELECT guest_id FROM guests WHERE email = ? LIMIT 1', [bookingData.email]);
        if (existingGuests.length > 0) {
          guestId = existingGuests[0].guest_id;
        } else {
          const insertGuest = await execute(
            'INSERT INTO guests (full_name, email, mobile_number, address, government_id) VALUES (?, ?, ?, ?, ?)',
            [bookingData.full_name, bookingData.email, bookingData.mobile_number, bookingData.address, bookingData.government_id]
          );
          guestId = insertGuest.insertId;
        }

        const rooms = await query('SELECT * FROM rooms WHERE room_id = ? LIMIT 1', [bookingData.room_id]);
        if (rooms.length === 0) throw new Error(`Select room ID ${bookingData.room_id} not found in Relational Index.`);
        const room = rooms[0];

        const startDay = new Date(bookingData.check_in_date);
        const endDay = new Date(bookingData.check_out_date);
        const days: string[] = [];
        let current = new Date(startDay);
        while (current < endDay) {
          days.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }

        if (days.length > 0) {
          const existingBooked = await query(
            'SELECT COUNT(*) as count FROM room_availability WHERE room_id = ? AND available_date IN (?) AND availability_status = "Booked"',
            [bookingData.room_id, days]
          );
          if (existingBooked[0].count > 0) {
            throw new Error(`Room ${room.room_number} is already booked for these selected dates.`);
          }
        }

        const insertBooking = await execute(
          'INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, booking_status, booking_source, assigned_staff) VALUES (?, ?, ?, ?, "Pending", "Website", "Rahul Sharma")',
          [guestId, bookingData.room_id, bookingData.check_in_date, bookingData.check_out_date]
        );
        const bookingId = insertBooking.insertId;

        for (const day of days) {
          await execute(
            'INSERT INTO room_availability (room_id, available_date, availability_status) VALUES (?, ?, "Booked") ON DUPLICATE KEY UPDATE availability_status = "Booked"',
            [bookingData.room_id, day]
          );
        }

        const stayNights = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));
        const roomCost = room.price_per_night * stayNights;
        const gstRate = room.price_per_night >= 7500 ? 0.18 : 0.12;
        const gstAmount = Math.round(roomCost * gstRate);
        const totalAmount = roomCost + gstAmount;

        const txnRef = `TXN${Math.floor(100000000000 + Math.random() * 900000000000)}`;
        await execute(
          'INSERT INTO payments (booking_id, amount, gst_amount, payment_method, payment_status, transaction_reference) VALUES (?, ?, ?, ?, "Paid", ?)',
          [bookingId, totalAmount, gstAmount, bookingData.payment_method, txnRef]
        );

        await query('COMMIT');

        const [booking] = await query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
        const [guestObj] = await query('SELECT * FROM guests WHERE guest_id = ?', [guestId]);
        const [payment] = await query('SELECT * FROM payments WHERE booking_id = ?', [bookingId]);

        return { 
          booking: { 
            ...booking, 
            check_in_date: formatDate(booking.check_in_date),
            check_out_date: formatDate(booking.check_out_date),
            is_archived: !!booking.is_archived 
          }, 
          guestObject: guestObj, 
          payment 
        };
      } catch (err) {
        await query('ROLLBACK');
        throw err;
      }
    });
  },

  archiveBooking: (bookingId: number, isArchived: boolean) => {
    const sql = `UPDATE bookings SET is_archived = ${isArchived ? 1 : 0} WHERE booking_id = ${bookingId};`;
    return executeQueryAsync(sql, ['bookings'], async () => {
      await execute('UPDATE bookings SET is_archived = ? WHERE booking_id = ?', [isArchived ? 1 : 0, bookingId]);
      const [booking] = await query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
      return { 
        ...booking, 
        check_in_date: formatDate(booking.check_in_date),
        check_out_date: formatDate(booking.check_out_date),
        is_archived: !!booking.is_archived 
      };
    });
  },

  updateBookingStatus: (bookingId: number, status: Booking['booking_status']) => {
    const sql = `UPDATE bookings SET booking_status = '${status}' WHERE booking_id = ${bookingId};`;
    return executeQueryAsync(sql, ['bookings', 'guest_accounts', 'rooms', 'housekeeping', 'room_availability', 'active_stays', 'stay_history'], async () => {
      await query('START TRANSACTION');
      try {
        await execute('UPDATE bookings SET booking_status = ? WHERE booking_id = ?', [status, bookingId]);
        const bookings = await query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
        if (bookings.length === 0) throw new Error("Booking record not encountered.");
        const found = bookings[0];

        const guests = await query('SELECT * FROM guests WHERE guest_id = ?', [found.guest_id]);
        if (guests.length > 0) {
          const guest = guests[0];
          const guestAccounts = await query('SELECT * FROM guest_accounts WHERE LOWER(email) = LOWER(?)', [guest.email]);
          if (guestAccounts.length > 0) {
            const guestAccount = guestAccounts[0];
            if (status === 'Checked-In') {
              await execute('UPDATE guest_accounts SET is_activated = 1 WHERE account_id = ?', [guestAccount.account_id]);
            } else if (status === 'Checked-Out') {
              const otherStays = await query(
                'SELECT * FROM bookings WHERE guest_id = ? AND booking_status = "Checked-In" AND booking_id != ?',
                [found.guest_id, bookingId]
              );
              if (otherStays.length === 0) {
                await execute('UPDATE guest_accounts SET is_activated = 0 WHERE account_id = ?', [guestAccount.account_id]);
              }
            }
          }
        }

        const rooms = await query('SELECT * FROM rooms WHERE room_id = ?', [found.room_id]);
        if (rooms.length > 0) {
          const room = rooms[0];
          if (status === 'Checked-In') {
            await execute('UPDATE rooms SET room_status = "Occupied" WHERE room_id = ?', [room.room_id]);
            await execute(
              'INSERT INTO active_stays (booking_id, guest_id, room_id, expected_check_out, status) VALUES (?, ?, ?, ?, "Checked-In") ON DUPLICATE KEY UPDATE status = "Checked-In"',
              [bookingId, found.guest_id, found.room_id, found.check_out_date]
            );
          } else if (status === 'Checked-Out') {
            await execute('UPDATE rooms SET room_status = "Dirty" WHERE room_id = ?', [room.room_id]);
            await execute('INSERT INTO housekeeping (room_id, assigned_staff, task_status) VALUES (?, "Karan Singh", "Pending")', [room.room_id]);
            await execute('DELETE FROM active_stays WHERE booking_id = ?', [bookingId]);
            const payments = await query('SELECT amount FROM payments WHERE booking_id = ?', [bookingId]);
            const totalAmount = payments.length > 0 ? payments[0].amount : 0.00;
            await execute(
              'INSERT INTO stay_history (booking_id, guest_id, room_id, check_in_date, check_out_date, status, total_amount) VALUES (?, ?, ?, ?, ?, "Checked-Out", ?) ON DUPLICATE KEY UPDATE status = "Checked-Out", total_amount = ?',
              [bookingId, found.guest_id, found.room_id, found.check_in_date, found.check_out_date, totalAmount, totalAmount]
            );
          } else if (status === 'Cancelled') {
            const startDay = new Date(found.check_in_date);
            const endDay = new Date(found.check_out_date);
            let current = new Date(startDay);
            while (current < endDay) {
              const dStr = current.toISOString().split('T')[0];
              await execute('UPDATE room_availability SET availability_status = "Available" WHERE room_id = ? AND available_date = ?', [found.room_id, dStr]);
              current.setDate(current.getDate() + 1);
            }
            await execute('DELETE FROM active_stays WHERE booking_id = ?', [bookingId]);
            await execute(
              'INSERT INTO stay_history (booking_id, guest_id, room_id, check_in_date, check_out_date, status, total_amount) VALUES (?, ?, ?, ?, ?, "Cancelled", 0.00) ON DUPLICATE KEY UPDATE status = "Cancelled", total_amount = 0.00',
              [bookingId, found.guest_id, found.room_id, found.check_in_date, found.check_out_date]
            );
          }
        }

        await query('COMMIT');
        const [booking] = await query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
        return { 
          ...booking, 
          check_in_date: formatDate(booking.check_in_date),
          check_out_date: formatDate(booking.check_out_date),
          is_archived: !!booking.is_archived 
        };
      } catch (err) {
        await query('ROLLBACK');
        throw err;
      }
    });
  },

  updatePaymentStatus: (paymentId: number, status: "Pending" | "Paid" | "Refunded") => {
    const sql = `UPDATE payments SET payment_status = '${status}' WHERE payment_id = ${paymentId};`;
    return executeQueryAsync(sql, ['payments'], async () => {
      await execute('UPDATE payments SET payment_status = ? WHERE payment_id = ?', [status, paymentId]);
      const [payment] = await query('SELECT * FROM payments WHERE payment_id = ?', [paymentId]);
      return payment;
    });
  },

  updateHousekeepingTask: (taskId: number, status: HousekeepingTask['task_status']) => {
    const sql = `UPDATE housekeeping SET task_status = '${status}' WHERE task_id = ${taskId};`;
    return executeQueryAsync(sql, ['housekeeping', 'rooms', 'active_stays', 'room_availability'], async () => {
      await query('START TRANSACTION');
      try {
        const completionTime = status === 'Completed' ? new Date() : null;
        await execute('UPDATE housekeeping SET task_status = ?, completion_time = ? WHERE task_id = ?', [status, completionTime, taskId]);
        const tasks = await query('SELECT * FROM housekeeping WHERE task_id = ?', [taskId]);
        if (tasks.length === 0) throw new Error("Housekeeping task not found.");
        const found = tasks[0];

        if (status === 'Completed') {
          await execute('UPDATE rooms SET room_status = "Available" WHERE room_id = ?', [found.room_id]);
          await execute('DELETE FROM active_stays WHERE room_id = ?', [found.room_id]);
          
          const todayStr = new Date().toISOString().split('T')[0];
          const bookingsToClear = await query(
            'SELECT * FROM bookings WHERE room_id = ? AND booking_status IN ("Checked-Out", "Checked-In") AND check_out_date >= ?',
            [found.room_id, todayStr]
          );
          for (const booking of bookingsToClear) {
            const start = new Date(booking.check_in_date) > new Date() ? booking.check_in_date : todayStr;
            const end = booking.check_out_date;
            
            let current = new Date(start);
            const endDay = new Date(end);
            while (current < endDay) {
              const dStr = current.toISOString().split('T')[0];
              await execute(
                'UPDATE room_availability SET availability_status = "Available" WHERE room_id = ? AND available_date = ?',
                [found.room_id, dStr]
              );
              current.setDate(current.getDate() + 1);
            }
          }
        }
        await query('COMMIT');
        return found;
      } catch (err) {
        await query('ROLLBACK');
        throw err;
      }
    });
  },

  submitComplaint: (complaintData: {
    email: string;
    complaint_category: Complaint['complaint_category'];
    complaint_description: string;
    priority_level: Complaint['priority_level'];
    room_id?: number;
    booking_id?: number;
  }) => {
    const sql = `INSERT INTO complaints ...`;
    return executeQueryAsync(sql, ['complaints', 'guests', 'bookings'], async () => {
      const guests = await query('SELECT guest_id FROM guests WHERE LOWER(email) = LOWER(?) LIMIT 1', [complaintData.email]);
      if (guests.length === 0) throw new Error("Only checked-in active guests can submit official complaints. Registered email not found.");
      const guestId = guests[0].guest_id;

      let roomId = complaintData.room_id;
      let bookingId = complaintData.booking_id;

      if (!roomId || !bookingId) {
        const activeBookings = await query('SELECT booking_id, room_id FROM bookings WHERE guest_id = ? AND booking_status = "Checked-In" LIMIT 1', [guestId]);
        if (activeBookings.length > 0) {
          roomId = roomId || activeBookings[0].room_id;
          bookingId = bookingId || activeBookings[0].booking_id;
        }
      }

      const insertResult = await execute(
        'INSERT INTO complaints (guest_id, room_id, booking_id, complaint_category, complaint_description, priority_level, complaint_status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
        [guestId, roomId, bookingId, complaintData.complaint_category, complaintData.complaint_description, complaintData.priority_level]
      );
      const [c] = await query('SELECT * FROM complaints WHERE complaint_id = ?', [insertResult.insertId]);
      return c;
    });
  },

  updateComplaintStatus: (complaintId: number, status: Complaint['complaint_status']) => {
    const sql = `UPDATE complaints SET complaint_status = '${status}' WHERE complaint_id = ${complaintId};`;
    return executeQueryAsync(sql, ['complaints'], async () => {
      await execute('UPDATE complaints SET complaint_status = ? WHERE complaint_id = ?', [status, complaintId]);
      const [c] = await query('SELECT * FROM complaints WHERE complaint_id = ?', [complaintId]);
      return c;
    });
  },

  submitFeedback: (feedbackData: {
    guest_name: string;
    email: string;
    rating: number;
    comments: string;
  }) => {
    const sql = `INSERT INTO feedback ...`;
    return executeQueryAsync(sql, ['feedback', 'guests'], async () => {
      let guestId: number;
      const guests = await query('SELECT guest_id FROM guests WHERE LOWER(email) = LOWER(?) LIMIT 1', [feedbackData.email]);
      if (guests.length > 0) {
        guestId = guests[0].guest_id;
      } else {
        const insertGuest = await execute(
          'INSERT INTO guests (full_name, email, mobile_number, address, government_id) VALUES (?, ?, "N/A", "N/A", "N/A")',
          [feedbackData.guest_name, feedbackData.email]
        );
        guestId = insertGuest.insertId;
      }

      const insertFb = await execute(
        'INSERT INTO feedback (guest_id, rating, comments) VALUES (?, ?, ?)',
        [guestId, feedbackData.rating, feedbackData.comments]
      );
      const [f] = await query('SELECT * FROM feedback WHERE feedback_id = ?', [insertFb.insertId]);
      return f;
    });
  },

  submitCorporateBooking: (corpData: Omit<CorporateBooking, 'corporate_booking_id' | 'booking_status' | 'created_at'>) => {
    const sql = `INSERT INTO corporate_bookings ...`;
    return executeQueryAsync(sql, ['corporate_bookings'], async () => {
      const insertResult = await execute(
        'INSERT INTO corporate_bookings (company_name, contact_person, contact_email, contact_phone, number_of_rooms, booking_dates, booking_status) VALUES (?, ?, ?, ?, ?, ?, "Pending")',
        [corpData.company_name, corpData.contact_person, corpData.contact_email, corpData.contact_phone, corpData.number_of_rooms, corpData.booking_dates]
      );
      const [cb] = await query('SELECT * FROM corporate_bookings WHERE corporate_booking_id = ?', [insertResult.insertId]);
      return cb;
    });
  },

  updateCorporateBooking: (corpId: number, status: CorporateBooking['booking_status']) => {
    const sql = `UPDATE corporate_bookings SET booking_status = '${status}' WHERE corporate_booking_id = ${corpId};`;
    return executeQueryAsync(sql, ['corporate_bookings'], async () => {
      await execute('UPDATE corporate_bookings SET booking_status = ? WHERE corporate_booking_id = ?', [status, corpId]);
      const [cb] = await query('SELECT * FROM corporate_bookings WHERE corporate_booking_id = ?', [corpId]);
      return cb;
    });
  },

  createRoomServiceRequest: (requestData: {
    email: string;
    request_type: string;
    room_id?: number;
    booking_id?: number;
  }) => {
    const sql = `INSERT INTO room_service_requests ...`;
    return executeQueryAsync(sql, ['room_service_requests', 'guests', 'bookings'], async () => {
      const guests = await query('SELECT guest_id FROM guests WHERE LOWER(email) = LOWER(?) LIMIT 1', [requestData.email]);
      if (guests.length === 0) throw new Error("Registered email not found. Please log in first.");
      const guestId = guests[0].guest_id;

      let roomId = requestData.room_id;
      let bookingId = requestData.booking_id;

      if (!roomId || !bookingId) {
        const activeBookings = await query('SELECT booking_id, room_id FROM bookings WHERE guest_id = ? AND booking_status = "Checked-In" LIMIT 1', [guestId]);
        if (activeBookings.length === 0) throw new Error("No active stay checked-in for this user.");
        roomId = roomId || activeBookings[0].room_id;
        bookingId = bookingId || activeBookings[0].booking_id;
      }

      const insertResult = await execute(
        'INSERT INTO room_service_requests (guest_id, room_id, booking_id, request_type, request_status) VALUES (?, ?, ?, ?, "Pending")',
        [guestId, roomId, bookingId, requestData.request_type]
      );
      const [r] = await query('SELECT * FROM room_service_requests WHERE request_id = ?', [insertResult.insertId]);
      return r;
    });
  },

  getRoomServiceRequests: () => {
    const sql = `
      SELECT r.*, g.full_name AS guest_name, rm.room_number
      FROM room_service_requests r
      LEFT JOIN guests g ON r.guest_id = g.guest_id
      LEFT JOIN rooms rm ON r.room_id = rm.room_id;
    `;
    return executeQueryAsync(sql, ['room_service_requests', 'guests', 'rooms'], async () => {
      return await query(sql);
    });
  },

  updateRoomServiceStatus: (requestId: number, status: RoomServiceRequest['request_status']) => {
    const sql = `UPDATE room_service_requests SET request_status = '${status}' WHERE request_id = ${requestId};`;
    return executeQueryAsync(sql, ['room_service_requests'], async () => {
      await execute('UPDATE room_service_requests SET request_status = ? WHERE request_id = ?', [status, requestId]);
      const [r] = await query('SELECT * FROM room_service_requests WHERE request_id = ?', [requestId]);
      return r;
    });
  },

  getGuestAccounts: () => {
    const sql = `
      SELECT ga.*, r.room_number, b.check_in_date, b.check_out_date 
      FROM guest_accounts ga
      LEFT JOIN guests g ON LOWER(ga.email) = LOWER(g.email)
      LEFT JOIN (
        SELECT guest_id, MAX(booking_id) as latest_booking_id
        FROM bookings
        WHERE booking_status != 'Cancelled'
        GROUP BY guest_id
      ) lb ON g.guest_id = lb.guest_id
      LEFT JOIN bookings b ON lb.latest_booking_id = b.booking_id
      LEFT JOIN rooms r ON b.room_id = r.room_id
      ORDER BY ga.created_at DESC;
    `;
    return executeQueryAsync(sql, ['guest_accounts', 'guests', 'bookings', 'rooms'], async () => {
      const rows = await query(sql);
      return rows.map((r: any) => ({
        ...r,
        is_activated: !!r.is_activated,
        first_login_password_changed: !!r.first_login_password_changed,
        room_number: r.room_number ? `Room ${r.room_number}` : 'Not Booked',
        check_in_date: r.check_in_date || 'N/A',
        check_out_date: r.check_out_date || 'N/A'
      }));
    });
  },

  createGuestAccount: (data: {
    full_name: string;
    mobile_number: string;
    email: string;
    stay_duration: string;
  }) => {
    const sql = `INSERT INTO guest_accounts ...`;
    console.log('[Diagnostics DB] createGuestAccount data received:', data);
    return executeQueryAsync(sql, ['guest_accounts', 'guests'], async () => {
      console.log('[Diagnostics DB] Beginning guest account transaction');

      // CRITICAL: All steps (GET_LOCK, START TRANSACTION, SELECT, INSERT, COMMIT,
      // RELEASE_LOCK) MUST run on the same physical MySQL connection.
      // Using pool.getConnection() guarantees this — the shared query()/execute()
      // helpers use pool.query() which can return a different connection each call,
      // making GET_LOCK completely ineffective across calls.
      const conn = await getPool().getConnection();
      const lockName = 'snp_guest_account_id_lock';

      try {
        // 1. Acquire advisory lock on THIS dedicated connection (10-second timeout)
        const [lockResult] = await conn.query(
          'SELECT GET_LOCK(?, 10) AS locked', [lockName]
        );
        const locked = (lockResult as any[])[0]?.locked;
        console.log('[Diagnostics DB] Advisory lock GET_LOCK result:', locked, '| connection threadId:', (conn as any).threadId);
        if (!locked) {
          throw new Error('Could not acquire advisory lock for guest ID generation. Please try again.');
        }

        await conn.query('START TRANSACTION');
        try {
          const [maxRows] = await conn.query(`
            SELECT MAX(
              CAST(SUBSTRING(guest_id_str, 8) AS UNSIGNED)
            ) AS max_suffix
            FROM guest_accounts
            WHERE guest_id_str LIKE 'SNP2026%'
          `);
          const maxSuffix = (maxRows as any[])[0]?.max_suffix;
          console.log('[Diagnostics DB] MAX suffix query result — max_suffix:', maxSuffix);

          const nextNum = (maxSuffix !== null && maxSuffix !== undefined)
            ? Number(maxSuffix) + 1
            : 1;
          console.log(`[Diagnostics DB] Computed nextNum: ${nextNum} (max_suffix was ${maxSuffix})`);

          const guest_id_str = `SNP2026${String(nextNum).padStart(3, '0')}`;
          const username     = `guest_snp${String(nextNum).padStart(3, '0')}`;
          const password_hash = `Temp@${Math.floor(100 + Math.random() * 900)}`;

          console.log('[Diagnostics DB] ✅ INSERTING — guest_id_str:', guest_id_str, '| username:', username, '| password_hash:', password_hash);

          const [insertResult] = await conn.execute(
            'INSERT INTO guest_accounts (guest_id_str, username, password_hash, full_name, mobile_number, email, stay_duration, is_activated, first_login_password_changed) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)',
            [guest_id_str, username, password_hash, data.full_name, data.mobile_number, data.email, data.stay_duration]
          );
          const accountId = (insertResult as any).insertId;
          console.log('[Diagnostics DB] INSERT guest_accounts succeeded — new account_id:', accountId);

          await conn.execute(
            'INSERT INTO guests (full_name, email, mobile_number, address, government_id) VALUES (?, ?, ?, "Refer to Guest Access Preference in Relational Index", ?)',
            [data.full_name, data.email, data.mobile_number, `Verified Guest Account (${guest_id_str})`]
          );
          console.log('[Diagnostics DB] INSERT guests succeeded');

          await conn.query('COMMIT');
          console.log('[Diagnostics DB] COMMIT successful — account created:', guest_id_str);

          const [accRows] = await conn.query(
            'SELECT * FROM guest_accounts WHERE account_id = ?', [accountId]
          );
          const acc = (accRows as any[])[0];
          return {
            ...acc,
            is_activated: !!acc.is_activated,
            first_login_password_changed: !!acc.first_login_password_changed
          };
        } catch (err) {
          console.error('[Diagnostics DB] Transaction failed, rolling back. Error:', err);
          await conn.query('ROLLBACK');
          throw err;
        }
      } finally {
        try {
          await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
          console.log('[Diagnostics DB] Advisory lock released');
        } catch (_) {}
        conn.release();
        console.log('[Diagnostics DB] Connection returned to pool');
      }
    });
  },

  updateGuestAccountPassword: (usernameOrGuestId: string, newPass: string) => {
    const sql = `UPDATE guest_accounts SET password_hash = '${newPass}', first_login_password_changed = 1 WHERE username = '${usernameOrGuestId}' OR guest_id_str = '${usernameOrGuestId}';`;
    return executeQueryAsync(sql, ['guest_accounts'], async () => {
      await execute(
        'UPDATE guest_accounts SET password_hash = ?, first_login_password_changed = 1 WHERE username = ? OR guest_id_str = ?',
        [newPass, usernameOrGuestId, usernameOrGuestId]
      );
      const accounts = await query('SELECT * FROM guest_accounts WHERE username = ? OR guest_id_str = ?', [usernameOrGuestId, usernameOrGuestId]);
      if (accounts.length === 0) throw new Error("Credentials reference not encountered in secure Relational index.");
      const acc = accounts[0];
      return {
        ...acc,
        is_activated: !!acc.is_activated,
        first_login_password_changed: !!acc.first_login_password_changed
      };
    });
  },

  toggleGuestAccountActivation: (accountId: number) => {
    const sql = `UPDATE guest_accounts SET is_activated = ...`;
    return executeQueryAsync(sql, ['guest_accounts'], async () => {
      await query('START TRANSACTION');
      try {
        const accounts = await query('SELECT is_activated FROM guest_accounts WHERE account_id = ?', [accountId]);
        if (accounts.length === 0) throw new Error("Account index not found.");
        const nextStatus = accounts[0].is_activated ? 0 : 1;
        await execute('UPDATE guest_accounts SET is_activated = ? WHERE account_id = ?', [nextStatus, accountId]);
        await query('COMMIT');
        const [acc] = await query('SELECT * FROM guest_accounts WHERE account_id = ?', [accountId]);
        return {
          ...acc,
          is_activated: !!acc.is_activated,
          first_login_password_changed: !!acc.first_login_password_changed
        };
      } catch (err) {
        await query('ROLLBACK');
        throw err;
      }
    });
  },

  deleteGuestAccount: (accountId: number) => {
    const sql = `DELETE FROM guest_accounts WHERE account_id = ${accountId};`;
    return executeQueryAsync(sql, ['guest_accounts'], async () => {
      await execute('DELETE FROM guest_accounts WHERE account_id = ?', [accountId]);
      return true;
    });
  },

  getCommunicationLogs: (filterOrGuestIdStr?: string | {
    guest_id_str?: string;
    booking_id?: string | number;
    log_id?: string | number;
    guest_id?: string | number;
  }) => {
    let guestIdStr: string | undefined;
    let guestId: string | number | undefined;
    let bookingId: string | number | undefined;
    let logId: string | number | undefined;

    if (typeof filterOrGuestIdStr === 'string') {
      guestIdStr = filterOrGuestIdStr;
    } else if (filterOrGuestIdStr) {
      guestIdStr = filterOrGuestIdStr.guest_id_str;
      guestId = filterOrGuestIdStr.guest_id;
      bookingId = filterOrGuestIdStr.booking_id;
      logId = filterOrGuestIdStr.log_id;
    }

    if (logId) {
      const sql = 'SELECT * FROM communication_history WHERE log_id = ?';
      return executeQueryAsync(sql, ['communication_history'], async () => {
        return await query(sql, [logId]);
      });
    }

    if (bookingId) {
      const sql = `
        SELECT cl.* FROM communication_history cl
        JOIN guests g ON LOWER(cl.guest_name) = LOWER(g.full_name) OR LOWER(cl.recipient_email) = LOWER(g.email)
        JOIN bookings b ON g.guest_id = b.guest_id
        WHERE b.booking_id = ?
        ORDER BY cl.timestamp DESC;
      `;
      return executeQueryAsync(sql, ['communication_history', 'guests', 'bookings'], async () => {
        return await query(sql, [bookingId]);
      });
    }

    let sql = 'SELECT * FROM communication_history';
    const conditions = [];
    const params = [];
    if (guestIdStr) {
      conditions.push('guest_id_str = ?');
      params.push(guestIdStr);
    }
    if (guestId) {
      conditions.push('(guest_id_str = ? OR guest_id_str = ?)');
      params.push(`SNP-GUEST-${guestId}`, `SNP2026${String(guestId).padStart(3, '0')}`);
    }
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY timestamp DESC;';

    return executeQueryAsync(sql, ['communication_history'], async () => {
      return await query(sql, params);
    });
  },

  createCommunicationLog: (logData: {
    guest_id_str: string;
    guest_name: string;
    channel: 'WhatsApp' | 'Email';
    status_info: '🟢 Delivered Successfully' | '🟡 Pending Delivery' | '🔵 In Progress' | '🟠 Retrying' | '🔴 Delivery Failed';
    staff_member: string;
    communication_type: string;
    failure_reason?: string;
    recipient_email?: string;
    api_response?: string;
    error_code?: string;
  }) => {
    const sql = `INSERT INTO communication_history ...`;
    return executeQueryAsync(sql, ['communication_history'], async () => {
      const insertResult = await execute(
        'INSERT INTO communication_history (guest_id_str, guest_name, communication_type, channel, status_info, timestamp, staff_member, delivery_attempts, failure_reason, recipient_email, api_response, error_code) VALUES (?, ?, ?, ?, ?, NOW(), ?, 1, ?, ?, ?, ?)',
        [
          logData.guest_id_str, logData.guest_name, logData.communication_type, logData.channel, logData.status_info,
          logData.staff_member, logData.failure_reason || '', logData.recipient_email || '', logData.api_response || '', logData.error_code || ''
        ]
      );
      const [l] = await query('SELECT * FROM communication_history WHERE log_id = ?', [insertResult.insertId]);
      return l;
    });
  },

  updateCommunicationLogStatus: (
    logId: number,
    status_info: CommunicationLog['status_info'],
    attempts?: number,
    reason?: string,
    recipient_email?: string,
    api_response?: string,
    error_code?: string
  ) => {
    const sql = `UPDATE communication_history SET status_info = ? ... WHERE log_id = ${logId};`;
    return executeQueryAsync(sql, ['communication_history'], async () => {
      const updates = [];
      const params = [];
      updates.push('status_info = ?');
      params.push(status_info);
      if (attempts !== undefined) {
        updates.push('delivery_attempts = ?');
        params.push(attempts);
      }
      if (reason !== undefined) {
        updates.push('failure_reason = ?');
        params.push(reason);
      }
      if (recipient_email !== undefined) {
        updates.push('recipient_email = ?');
        params.push(recipient_email);
      }
      if (api_response !== undefined) {
        updates.push('api_response = ?');
        params.push(api_response);
      }
      if (error_code !== undefined) {
        updates.push('error_code = ?');
        params.push(error_code);
      }
      params.push(logId);
      await execute(`UPDATE communication_history SET ${updates.join(', ')}, timestamp = NOW() WHERE log_id = ?`, params);
      const [l] = await query('SELECT * FROM communication_history WHERE log_id = ?', [logId]);
      return l;
    });
  },

  resetRoomCleanStatus: (roomId: number, staffMember: string) => {
    const sql = `UPDATE rooms SET room_status = 'Available' WHERE room_id = ${roomId};`;
    return executeQueryAsync(sql, ['rooms', 'housekeeping', 'active_stays', 'room_availability', 'front_desk_records'], async () => {
      await query('START TRANSACTION');
      try {
        // 1. Fetch room details
        const rooms = await query('SELECT room_number FROM rooms WHERE room_id = ? LIMIT 1', [roomId]);
        if (rooms.length === 0) throw new Error(`Room ID ${roomId} not found.`);
        const roomNumber = rooms[0].room_number;

        // 2. Update room_status to Available
        await execute('UPDATE rooms SET room_status = "Available" WHERE room_id = ?', [roomId]);

        // 3. Clear any housekeeping pending flags (mark active tasks as Completed)
        await execute(
          'UPDATE housekeeping SET task_status = "Completed", completion_time = NOW() WHERE room_id = ? AND task_status != "Completed"',
          [roomId]
        );

        // 4. Reset occupancy-related locks
        await execute('DELETE FROM active_stays WHERE room_id = ?', [roomId]);

        // 5. Update room availability records for checked-out bookings
        const todayStr = new Date().toISOString().split('T')[0];
        const bookingsToClear = await query(
          'SELECT * FROM bookings WHERE room_id = ? AND booking_status IN ("Checked-Out", "Checked-In") AND check_out_date >= ?',
          [roomId, todayStr]
        );
        for (const booking of bookingsToClear) {
          const start = new Date(booking.check_in_date) > new Date() ? booking.check_in_date : todayStr;
          const end = booking.check_out_date;
          
          let current = new Date(start);
          const endDay = new Date(end);
          while (current < endDay) {
            const dStr = current.toISOString().split('T')[0];
            await execute(
              'UPDATE room_availability SET availability_status = "Available" WHERE room_id = ? AND available_date = ?',
              [roomId, dStr]
            );
            current.setDate(current.getDate() + 1);
          }
        }

        // 6. Log the action in front_desk_records
        const logPayload = JSON.stringify({
          room_number: roomNumber,
          staff_member: staffMember,
          date_time: new Date().toISOString(),
          action: 'Mark Room Clean & Available'
        });
        await execute(
          'INSERT INTO front_desk_records (ref_type, ref_id, payload) VALUES ("ROOM_CLEAN_RESET", ?, ?)',
          [roomId, logPayload]
        );

        await query('COMMIT');

        const [updatedRoom] = await query('SELECT * FROM rooms WHERE room_id = ?', [roomId]);
        return {
          ...updatedRoom,
          amenities: typeof updatedRoom.amenities === 'string' ? JSON.parse(updatedRoom.amenities) : updatedRoom.amenities,
          gallery_images: typeof updatedRoom.gallery_images === 'string' ? JSON.parse(updatedRoom.gallery_images) : updatedRoom.gallery_images,
          reviews: typeof updatedRoom.reviews === 'string' ? JSON.parse(updatedRoom.reviews) : updatedRoom.reviews
        };
      } catch (err) {
        await query('ROLLBACK');
        throw err;
      }
    });
  },

  getMonthlyRevenueTrend: () => {
    const sql = `
      SELECT 
        MONTH(payment_date) AS month,
        SUM(amount) AS revenue
      FROM payments
      GROUP BY MONTH(payment_date)
      ORDER BY MONTH(payment_date);
    `;
    return executeQueryAsync(sql, ['payments'], async () => {
      const rows = await query(sql);
      const months = [
        { name: 'January', num: 1 },
        { name: 'February', num: 2 },
        { name: 'March', num: 3 },
        { name: 'April', num: 4 },
        { name: 'May', num: 5 },
        { name: 'June', num: 6 },
        { name: 'July', num: 7 },
        { name: 'August', num: 8 },
        { name: 'September', num: 9 },
        { name: 'October', num: 10 },
        { name: 'November', num: 11 },
        { name: 'December', num: 12 }
      ];
      
      const trends = months.map(m => {
        const row = rows.find((r: any) => Number(r.month) === m.num);
        const revenue = row ? Number(row.revenue) : 0;
        return {
          name: m.name,
          revenue: isNaN(revenue) || revenue === null ? 0 : revenue
        };
      });

      // Console log formatted as Jan: xxxx, Feb: xxxx, ...
      const abbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const logData: { [key: string]: number } = {};
      trends.forEach((t, i) => {
        logData[abbreviations[i]] = t.revenue;
      });
      console.log('Monthly Revenue Data:\n', logData);

      return trends;
    });
  }
};
