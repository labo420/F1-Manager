import { pool } from "./db";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_reserve BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await client.query(`
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS original_driver_id INTEGER;
    `);
    await client.query(`
      ALTER TABLE races ADD COLUMN IF NOT EXISTS fp1_date TEXT;
    `);
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    `);
    await client.query(`
      ALTER TABLE races ADD COLUMN IF NOT EXISTS has_sprint BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    
    // Mark races with sprint sessions: Chinese GP (2), Miami GP (6), Canadian GP (7), British GP (11), Dutch GP (14), Singapore GP (18)
    await client.query(`
      UPDATE races SET has_sprint = true WHERE round IN (2, 6, 7, 11, 14, 18);
    `);
    
    console.log("[migrate] Schema is up to date");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
