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

const alterQueries = [
  // bookings
  { table: 'bookings', index: 'idx_bookings_created_at', sql: 'ALTER TABLE bookings ADD INDEX idx_bookings_created_at (created_at)' },
  { table: 'bookings', index: 'idx_bookings_check_in_date', sql: 'ALTER TABLE bookings ADD INDEX idx_bookings_check_in_date (check_in_date)' },
  { table: 'bookings', index: 'idx_bookings_check_out_date', sql: 'ALTER TABLE bookings ADD INDEX idx_bookings_check_out_date (check_out_date)' },
  // rooms
  { table: 'rooms', index: 'idx_rooms_created_at', sql: 'ALTER TABLE rooms ADD INDEX idx_rooms_created_at (created_at)' },
  // guests
  { table: 'guests', index: 'idx_guests_created_at', sql: 'ALTER TABLE guests ADD INDEX idx_guests_created_at (created_at)' },
  // guest_accounts
  { table: 'guest_accounts', index: 'idx_guest_accounts_created_at', sql: 'ALTER TABLE guest_accounts ADD INDEX idx_guest_accounts_created_at (created_at)' },
  // payments
  { table: 'payments', index: 'idx_payments_payment_date', sql: 'ALTER TABLE payments ADD INDEX idx_payments_payment_date (payment_date)' },
  // complaints
  { table: 'complaints', index: 'idx_complaints_created_at', sql: 'ALTER TABLE complaints ADD INDEX idx_complaints_created_at (created_at)' },
  // communication_history
  { table: 'communication_history', index: 'idx_communication_history_timestamp', sql: 'ALTER TABLE communication_history ADD INDEX idx_communication_history_timestamp (timestamp)' }
];

async function run() {
  console.log('Connecting to database:', dbConfig.database);
  const conn = await mysql.createConnection(dbConfig);
  try {
    for (const q of alterQueries) {
      const [indexes] = await conn.query(`SHOW INDEX FROM ${q.table}`);
      const exists = indexes.some(idx => idx.Key_name === q.index);
      if (exists) {
        console.log(`Index ${q.index} already exists on ${q.table}.`);
      } else {
        console.log(`Adding index ${q.index} to ${q.table}...`);
        await conn.query(q.sql);
        console.log(`Index ${q.index} added successfully.`);
      }
    }
  } catch (err) {
    console.error('Failed to apply indexes:', err);
  } finally {
    await conn.end();
  }
}

run();
