import { pool } from "./db";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_reserve BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await client.query(`
      ALTER TABLE races ADD COLUMN IF NOT EXISTS fp1_date TEXT;
    `);
    console.log("[migrate] Schema is up to date");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
