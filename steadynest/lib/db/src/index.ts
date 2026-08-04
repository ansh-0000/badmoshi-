import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

// The connection string used to be a hardcoded literal here, which meant
// DATABASE_URL in artifacts/api-server/.env was validated by config/env.ts and
// then silently ignored — every environment, including production, would have
// connected to whatever `localhost` happened to be, with dev credentials
// committed to a PUBLIC repo. Fail loudly instead of falling back.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. The database package reads it from the environment; " +
      "there is deliberately no default. Copy artifacts/api-server/.env.example to .env " +
      "and fill it in, or export DATABASE_URL before running drizzle-kit."
  );
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });

export * from "./schema/index";
