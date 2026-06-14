import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function initMysqlPool() {
  if (pool) return pool;
  const host = process.env.MYSQL_HOST;
  if (!host) throw new Error('MYSQL_HOST not configured');
  pool = mysql.createPool({
    host: host,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

export async function query(sql: string, params?: any[]) {
  if (!pool) initMysqlPool();
  // @ts-ignore
  const [rows] = await pool!.query(sql, params || []);
  return rows as any;
}

export async function execute(sql: string, params?: any[]) {
  if (!pool) initMysqlPool();
  // @ts-ignore
  const [result] = await pool!.execute(sql, params || []);
  return result as any;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
