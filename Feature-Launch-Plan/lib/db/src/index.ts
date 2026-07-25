import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;
const pool = new Pool({
  connectionString: "postgresql://steady_user:steady_password@localhost:5432/steady_nest?schema=public",
});

export const db = drizzle(pool, { schema });

export * from "./schema/index";
