import { defineConfig } from "drizzle-kit";

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. drizzle-kit will not fall back to a default — " +
        "run it with the same DATABASE_URL the API server uses, e.g.\n" +
        "  DATABASE_URL=postgresql://user:pass@host:5432/db pnpm --filter @workspace/db run migrate"
    );
  }
  return url;
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  // Third and last copy of the hardcoded connection string (the others were in
  // src/index.ts and the now-deleted insert.cjs). drizzle-kit runs migrations,
  // so a wrong default here points schema changes at the wrong database
  // silently — and these dev credentials are committed to a PUBLIC repo.
  dbCredentials: {
    url: requireDatabaseUrl(),
  },
});
