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

async function inspect() {
  console.log('Connecting to database:', dbConfig.database);
  const conn = await mysql.createConnection(dbConfig);
  try {
    const tables = [
      'bookings', 'rooms', 'guests', 'guest_accounts', 'payments', 'complaints', 'communication_history'
    ];
    for (const table of tables) {
      console.log(`\nTable: ${table}`);
      const [rows] = await conn.query(`SHOW INDEX FROM ${table}`);
      for (const row of rows) {
        console.log(` - Index: ${row.Key_name}, Column: ${row.Column_name}, Non_unique: ${row.Non_unique}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

inspect();
