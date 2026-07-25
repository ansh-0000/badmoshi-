import { db } from './src/index';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`
      ALTER TABLE listings 
      ADD COLUMN IF NOT EXISTS security_deposit integer,
      ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS address text,
      ADD COLUMN IF NOT EXISTS available_from timestamp,
      ADD COLUMN IF NOT EXISTS images text[];
    `);
    console.log("Successfully altered listings table");
  } catch (err) {
    console.error("Error altering listings table:", err);
  } finally {
    process.exit(0);
  }
}

main();
