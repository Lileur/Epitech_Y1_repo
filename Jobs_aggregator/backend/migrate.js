import fs from "fs";
import mysql from "mysql2/promise";
import "dotenv/config";

async function createMigrationConnection() {
  if (process.env.DATABASE_URL) {
    const baseUri = process.env.DATABASE_URL.replace(/\/jobsense$/, "");
    return mysql.createConnection({ uri: baseUri, multipleStatements: true });
  }

  return mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
  });
}

async function migrate() {
  let connection;
  try {
    connection = await createMigrationConnection();
    await connection.query("CREATE DATABASE IF NOT EXISTS jobsense;");
    await connection.query("USE jobsense;");

    const schema = fs.readFileSync("./schema.sql", "utf8");
    const statements = schema.split(";").filter((stmt) => stmt.trim().length > 0);
    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (e) {
        if (!e.message.includes("Duplicate key name")) {
          console.warn("Warning on statement execution:", e.message);
        }
      }
    }

    console.log("Migration OK");
  } catch (err) {
    console.error("Migration error:", err);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
    process.exit(process.exitCode ?? 0);
  }
}

migrate();
