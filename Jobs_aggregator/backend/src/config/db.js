import mysql from "mysql2/promise";

function createPool() {
  if (process.env.DATABASE_URL) {
    return mysql.createPool(process.env.DATABASE_URL);
  }

  return mysql.createPool({
    host: process.env.DB_HOST || "db",
    user: process.env.DB_USER || "jobsense_user",
    password: process.env.DB_PASSWORD || "jobsense_password",
    database: process.env.DB_NAME || "jobsense",
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

const db = createPool();

export default db;