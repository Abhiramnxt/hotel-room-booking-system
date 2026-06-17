import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'hotel_management'
};

async function migrate() {
  console.log('Connecting to database for migration:', dbConfig.database);
  const conn = await mysql.createConnection(dbConfig);
  try {
    // 1. Check and alter room_service_requests table
    console.log('Checking room_service_requests columns...');
    const [rsrColumns] = await conn.query('DESCRIBE room_service_requests');
    const hasRsrBookingId = rsrColumns.some(col => col.Field === 'booking_id');

    if (!hasRsrBookingId) {
      console.log('Adding booking_id column to room_service_requests...');
      await conn.query('ALTER TABLE room_service_requests ADD COLUMN booking_id INT DEFAULT NULL');
      console.log('Adding foreign key constraint to room_service_requests...');
      await conn.query('ALTER TABLE room_service_requests ADD CONSTRAINT fk_rsr_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE');
      console.log('Populating existing room_service_requests booking_id values...');
      // Map old room_service_requests to the guest's booking_id for checked-in or latest booking
      await conn.query(`
        UPDATE room_service_requests rsr
        JOIN bookings b ON rsr.guest_id = b.guest_id AND rsr.room_id = b.room_id
        SET rsr.booking_id = b.booking_id
        WHERE rsr.booking_id IS NULL;
      `);
    } else {
      console.log('room_service_requests already has booking_id column.');
    }

    // 2. Check and alter complaints table
    console.log('Checking complaints columns...');
    const [complaintColumns] = await conn.query('DESCRIBE complaints');
    const hasComplaintBookingId = complaintColumns.some(col => col.Field === 'booking_id');
    const hasComplaintRoomId = complaintColumns.some(col => col.Field === 'room_id');

    if (!hasComplaintRoomId) {
      console.log('Adding room_id column to complaints...');
      await conn.query('ALTER TABLE complaints ADD COLUMN room_id INT DEFAULT NULL');
      await conn.query('ALTER TABLE complaints ADD CONSTRAINT fk_complaints_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE');
    } else {
      console.log('complaints already has room_id column.');
    }

    if (!hasComplaintBookingId) {
      console.log('Adding booking_id column to complaints...');
      await conn.query('ALTER TABLE complaints ADD COLUMN booking_id INT DEFAULT NULL');
      await conn.query('ALTER TABLE complaints ADD CONSTRAINT fk_complaints_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE');
      console.log('Populating existing complaints room_id and booking_id values...');
      // Map existing complaints using guest_id and checked-in or latest bookings
      await conn.query(`
        UPDATE complaints c
        JOIN bookings b ON c.guest_id = b.guest_id AND b.booking_status = 'Checked-In'
        SET c.room_id = b.room_id, c.booking_id = b.booking_id
        WHERE c.booking_id IS NULL;
      `);
    } else {
      console.log('complaints already has booking_id column.');
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await conn.end();
  }
}

migrate();
