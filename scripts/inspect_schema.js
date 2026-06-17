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
    const tables = ['bookings', 'active_stays', 'room_service_requests', 'complaints'];
    for (const table of tables) {
      console.log(`\n--- Schema for table: ${table} ---`);
      try {
        const [rows] = await conn.query(`DESCRIBE ${table}`);
        for (const row of rows) {
          console.log(`Column: ${row.Field}, Type: ${row.Type}, Null: ${row.Null}, Key: ${row.Key}, Default: ${row.Default}`);
        }
      } catch (err) {
        console.error(`Error describing table ${table}:`, err.message);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

inspect();
