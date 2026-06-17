import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'hotel_management'
};

async function main() {
  console.log('Connecting to database:', dbConfig.database);
  const conn = await mysql.createConnection(dbConfig);
  try {
    const dataPath = path.join(process.cwd(), 'mock_mysql_data.json');
    console.log('Reading data from:', dataPath);
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    // Disable foreign key checks temporarily to allow clean insertion
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // Clean tables before importing
    console.log('Truncating existing records...');
    const tables = [
      'staff_accounts', 'guests', 'guest_accounts', 'rooms', 'bookings',
      'active_stays', 'stay_history', 'payments', 'housekeeping',
      'room_service_requests', 'complaints', 'feedback', 'corporate_bookings',
      'room_availability', 'communication_history', 'front_desk_records'
    ];
    for (const table of tables) {
      await conn.query(`TRUNCATE TABLE ${table}`);
    }

    // Insert staff
    console.log('Importing staff...');
    if (data.staff) {
      for (const s of data.staff) {
        await conn.query(
          'INSERT INTO staff_accounts (staff_id, staff_name, department, role, email, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
          [s.staff_id, s.staff_name, s.department, s.role, s.email, s.phone_number]
        );
      }
    }

    // Insert guests
    console.log('Importing guests...');
    if (data.guests) {
      for (const g of data.guests) {
        await conn.query(
          'INSERT INTO guests (guest_id, full_name, email, mobile_number, address, government_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [g.guest_id, g.full_name, g.email, g.mobile_number, g.address, g.government_id, g.created_at ? new Date(g.created_at) : new Date()]
        );
      }
    }

    // Insert guest_accounts
    console.log('Importing guest accounts...');
    if (data.guest_accounts) {
      for (const a of data.guest_accounts) {
        await conn.query(
          'INSERT INTO guest_accounts (account_id, guest_id_str, username, password_hash, full_name, mobile_number, email, stay_duration, is_activated, first_login_password_changed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [a.account_id, a.guest_id_str, a.username, a.password_hash, a.full_name, a.mobile_number, a.email, a.stay_duration, a.is_activated ? 1 : 0, a.first_login_password_changed ? 1 : 0, a.created_at ? new Date(a.created_at) : new Date()]
        );
      }
    }

    // Insert rooms
    console.log('Importing rooms...');
    if (data.rooms) {
      for (const r of data.rooms) {
        await conn.query(
          'INSERT INTO rooms (room_id, room_number, room_type, room_name, capacity, amenities, price_per_night, room_status, image_url, gallery_images, description, size_sqft, bed_type, view_type, reviews, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            r.room_id, r.room_number, r.room_type, r.room_name, r.capacity, 
            JSON.stringify(r.amenities || []), r.price_per_night, r.room_status, 
            r.image_url, JSON.stringify(r.gallery_images || []), r.description || '', 
            r.size_sqft || 0, r.bed_type || '', r.view_type || '', 
            JSON.stringify(r.reviews || []), r.created_at ? new Date(r.created_at) : new Date()
          ]
        );
      }
    }

    // Insert bookings
    console.log('Importing bookings...');
    if (data.bookings) {
      for (const b of data.bookings) {
        await conn.query(
          'INSERT INTO bookings (booking_id, guest_id, room_id, check_in_date, check_out_date, booking_status, booking_source, assigned_staff, is_archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [b.booking_id, b.guest_id, b.room_id, b.check_in_date, b.check_out_date, b.booking_status, b.booking_source, b.assigned_staff || null, b.is_archived ? 1 : 0, b.created_at ? new Date(b.created_at) : new Date()]
        );

        // Derive active_stays or stay_history
        if (b.booking_status === 'Checked-In') {
          await conn.query(
            'INSERT INTO active_stays (booking_id, guest_id, room_id, expected_check_out, status) VALUES (?, ?, ?, ?, ?)',
            [b.booking_id, b.guest_id, b.room_id, b.check_out_date, 'Checked-In']
          );
        } else if (b.booking_status === 'Checked-Out' || b.booking_status === 'Cancelled') {
          await conn.query(
            'INSERT INTO stay_history (booking_id, guest_id, room_id, check_in_date, check_out_date, status, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [b.booking_id, b.guest_id, b.room_id, b.check_in_date, b.check_out_date, b.booking_status, 0]
          );
        }
      }
    }

    // Insert payments
    console.log('Importing payments...');
    if (data.payments) {
      for (const p of data.payments) {
        await conn.query(
          'INSERT INTO payments (payment_id, booking_id, amount, gst_amount, payment_method, payment_status, transaction_reference, payment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [p.payment_id, p.booking_id, p.amount, p.gst_amount, p.payment_method, p.payment_status, p.transaction_reference, p.payment_date ? new Date(p.payment_date) : new Date()]
        );

        // Update total_amount in stay_history if matching booking exists
        await conn.query(
          'UPDATE stay_history SET total_amount = ? WHERE booking_id = ?',
          [p.amount, p.booking_id]
        );
      }
    }

    // Insert housekeeping
    console.log('Importing housekeeping...');
    if (data.housekeeping) {
      for (const h of data.housekeeping) {
        await conn.query(
          'INSERT INTO housekeeping (task_id, room_id, assigned_staff, task_status, completion_time, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [h.task_id, h.room_id, h.assigned_staff, h.task_status, h.completion_time ? new Date(h.completion_time) : null, h.created_at ? new Date(h.created_at) : new Date()]
        );
      }
    }

    // Insert room_service_requests
    console.log('Importing room service requests...');
    if (data.room_service_requests) {
      for (const r of data.room_service_requests) {
        await conn.query(
          'INSERT INTO room_service_requests (request_id, guest_id, room_id, request_type, request_status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [r.request_id, r.guest_id, r.room_id, r.request_type, r.request_status, r.created_at ? new Date(r.created_at) : new Date()]
        );
      }
    }

    // Insert complaints
    console.log('Importing complaints...');
    if (data.complaints) {
      for (const c of data.complaints) {
        await conn.query(
          'INSERT INTO complaints (complaint_id, guest_id, complaint_category, complaint_description, priority_level, complaint_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [c.complaint_id, c.guest_id, c.complaint_category, c.complaint_description, c.priority_level, c.complaint_status, c.created_at ? new Date(c.created_at) : new Date()]
        );
      }
    }

    // Insert feedback
    console.log('Importing feedback...');
    if (data.feedback) {
      for (const f of data.feedback) {
        await conn.query(
          'INSERT INTO feedback (feedback_id, guest_id, rating, comments, submitted_at) VALUES (?, ?, ?, ?, ?)',
          [f.feedback_id, f.guest_id, f.rating, f.comments, f.submitted_at ? new Date(f.submitted_at) : new Date()]
        );
      }
    }

    // Insert corporate_bookings
    console.log('Importing corporate bookings...');
    if (data.corporate_bookings) {
      for (const cb of data.corporate_bookings) {
        await conn.query(
          'INSERT INTO corporate_bookings (corporate_booking_id, company_name, contact_person, contact_email, contact_phone, number_of_rooms, booking_dates, booking_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [cb.corporate_booking_id, cb.company_name, cb.contact_person, cb.contact_email, cb.contact_phone, cb.number_of_rooms, cb.booking_dates, cb.booking_status, cb.created_at ? new Date(cb.created_at) : new Date()]
        );
      }
    }

    // Insert room_availability
    console.log('Importing room availability...');
    if (data.room_availability) {
      for (const ra of data.room_availability) {
        await conn.query(
          'INSERT INTO room_availability (availability_id, room_id, available_date, availability_status) VALUES (?, ?, ?, ?)',
          [ra.availability_id, ra.room_id, ra.available_date, ra.availability_status]
        );
      }
    }

    // Insert communication_logs -> communication_history
    console.log('Importing communication history...');
    if (data.communication_logs) {
      for (const l of data.communication_logs) {
        await conn.query(
          'INSERT INTO communication_history (log_id, guest_id_str, guest_name, communication_type, channel, status_info, timestamp, staff_member, delivery_attempts, failure_reason, recipient_email, api_response, error_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            l.log_id, l.guest_id_str, l.guest_name, l.communication_type, l.channel, l.status_info, 
            l.timestamp ? new Date(l.timestamp) : new Date(), l.staff_member, l.delivery_attempts || 1, 
            l.failure_reason || '', l.recipient_email || '', l.api_response || '', l.error_code || ''
          ]
        );
      }
    }

    // Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await conn.end();
  }
}

main();
