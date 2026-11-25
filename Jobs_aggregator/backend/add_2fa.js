import "dotenv/config";
import db from "./src/config/db.js";

async function run() {
  try {
    await db.query(`ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) DEFAULT NULL;`);
    await db.query(`ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;`);
    console.log("Columns added successfully.");
  } catch (err) {
    if (err.message.includes("Duplicate column name")) {
      console.log("Columns already exist.");
    } else {
      console.error(err);
    }
  } finally {
    process.exit();
  }
}
run();
