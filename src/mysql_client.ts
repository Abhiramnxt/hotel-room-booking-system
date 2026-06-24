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
    connectionLimit: 20,           // Increased from 10 — supports concurrent staff + guest sessions
    queueLimit: 0,
    connectTimeout: 30000,         // 30s timeout for Railway remote connections
    enableKeepAlive: true,         // Prevent Railway from silently dropping idle connections
    keepAliveInitialDelay: 10000,  // Send first keepalive packet after 10s of idle
    // SSL always enabled — Railway MySQL requires it regardless of env configuration
    ssl: { rejectUnauthorized: false },
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

export function getPool(): mysql.Pool {
  if (!pool) initMysqlPool();
  return pool!;
}
