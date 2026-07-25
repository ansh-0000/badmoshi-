import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://steady_user:steady_password@localhost:5432/steady_nest?schema=public",
  },
});
